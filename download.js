import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { stopBar, updateProgress } from "./bar.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sanitizeFilename(filename) {
  return filename.replace(/[\x00-\x1f<>:"/\\|?*\u{7f}]/gu, "-").trim();
}

function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getAvailableFilename(basePath) {
  if (!fs.existsSync(basePath)) return basePath;

  const ext = path.extname(basePath);
  const name = path.basename(basePath, ext);
  const dir = path.dirname(basePath);

  for (let i = 1; i < 100; i++) {
    const newName = path.join(dir, `${name} (${i})${ext}`);
    if (!fs.existsSync(newName)) return newName;
  }
  throw new Error(
    "Filename not found after 100 tries. Please try a different name."
  );
}

function findClosestResolution(availableFormats, targetResolution) {
  const targetNum = parseInt(targetResolution);
  if (isNaN(targetNum)) return null;

  const filtered = availableFormats
    .map((f) => ({
      format: f,
      resNum: parseInt(f.qualityLabel),
    }))
    .filter(({ resNum }) => !isNaN(resNum));

  if (filtered.length === 0) return null;

  filtered.sort(
    (a, b) => Math.abs(a.resNum - targetNum) - Math.abs(b.resNum - targetNum)
  );

  return filtered[0].format;
}

function streamToFile(stream, filepath, totalBytes) {
  return new Promise((resolve, reject) => {
    if (
      typeof totalBytes === "number" &&
      !isNaN(totalBytes) &&
      totalBytes > 0
    ) {
      let downloaded = 0;
      stream.on("data", (chunk) => {
        downloaded += chunk.length;
        updateProgress(downloaded, totalBytes);
      });
    }

    stream
      .pipe(fs.createWriteStream(filepath))
      .on("finish", () => {
        stopBar();
        resolve();
      })
      .on("error", reject);
  });
}

export async function downloadVideo(
  url,
  container = "mp4",
  resolution = "720p",
  frequency = 44100,
  mp3Bitrate = 128
) {
  try {
    if (!ytdl.validateURL(url)) {
      console.error("Invalid URL. Please provide a valid YouTube link.");
      return;
    }

    const info = await ytdl.getInfo(url);

    // Prepare folders
    const tempDir = path.resolve(__dirname, "temp");
    const outputDir = path.resolve(__dirname, "output");
    ensureDirExists(tempDir);
    ensureDirExists(outputDir);

    // Sanitize filename for platform compatibility
    const cleanTitle = sanitizeFilename(info.videoDetails.title);
    const baseOutputPath = path.join(outputDir, `${cleanTitle}.${container}`);
    const outputPath = getAvailableFilename(baseOutputPath);

    if (container === "mp4") {
      const muxedFormats = ytdl
        .filterFormats(info.formats, "videoandaudio")
        .filter((f) => f.container === "mp4");
      const videoOnlyFormats = ytdl
        .filterFormats(info.formats, "videoonly")
        .filter((f) => f.container === "mp4");
      const audioOnlyFormats = ytdl.filterFormats(info.formats, "audioonly");

      let selectedFormat = muxedFormats.find(
        (f) => f.qualityLabel === resolution
      );

      if (!selectedFormat) {
        selectedFormat = findClosestResolution(videoOnlyFormats, resolution);
        if (!selectedFormat)
          throw new Error(
            "No suitable video format found for the specified resolution."
          );

        const bestAudioFormat = audioOnlyFormats.reduce(
          (prev, curr) => (curr.audioBitrate > prev.audioBitrate ? curr : prev),
          audioOnlyFormats[0]
        );

        if (!bestAudioFormat)
          throw new Error("No high-quality audio format found.");

        console.log(
          `Muxed format not found. Downloading video-only: ${selectedFormat.qualityLabel}, audio bitrate: ${bestAudioFormat.audioBitrate} kbps.`
        );

        const tempVideoPath = path.join(
          tempDir,
          `temp-video-${Date.now()}.mp4`
        );
        const tempAudioPath = path.join(
          tempDir,
          `temp-audio-${Date.now()}.mp4`
        );

        await Promise.all([
          streamToFile(
            ytdl(url, { format: selectedFormat }),
            tempVideoPath,
            parseInt(selectedFormat.contentLength)
          ),
          streamToFile(
            ytdl(url, { format: bestAudioFormat }),
            tempAudioPath,
            parseInt(bestAudioFormat.contentLength)
          ),
        ]);

        await new Promise((resolve, reject) => {
          ffmpeg()
            .input(tempVideoPath)
            .input(tempAudioPath)
            .outputOptions(["-c:v copy", "-c:a aac", "-strict experimental"])
            .save(outputPath)
            .on("end", () => {
              fs.unlinkSync(tempVideoPath);
              fs.unlinkSync(tempAudioPath);
              console.log(
                `\nVideo and audio successfully merged: ${outputPath}`
              );
              resolve();
            })
            .on("error", (err) => {
              console.error("\nError during merging:", err);
              reject(err);
            });
        });
      } else {
        const videoStream = ytdl(url, { format: selectedFormat });
        videoStream.on("progress", (chunkLength, downloaded, total) => {
          updateProgress(downloaded, total);
        });

        await streamToFile(videoStream, outputPath);
        stopBar();
        console.log(`\nVideo successfully downloaded: ${outputPath}`);
      }
    } else if (container === "mp3") {
      const tempAudioPath = path.join(tempDir, `temp-audio-${Date.now()}.webm`);
      const audioFormats = ytdl.filterFormats(info.formats, "audioonly");
      const bestAudioFormat = audioFormats.reduce((prev, curr) =>
        curr.audioBitrate > prev.audioBitrate ? curr : prev
      );

      const totalBytes = parseInt(bestAudioFormat.contentLength);
      let downloaded = 0;
      const audioStream = ytdl(url, { format: bestAudioFormat });

      const formattedFrequency = parseInt(frequency);

      console.log(
        `Downloading audio: Bitrate ${mp3Bitrate} kbps, Sample rate ${frequency} Hz`
      );

      audioStream.on("data", (chunk) => {
        downloaded += chunk.length;
        updateProgress(downloaded, totalBytes);
      });

      await streamToFile(audioStream, tempAudioPath);

      await new Promise((resolve, reject) => {
        ffmpeg(tempAudioPath)
          .audioBitrate(mp3Bitrate)
          .audioFrequency(formattedFrequency)
          .save(outputPath)
          .on("end", () => {
            fs.unlinkSync(tempAudioPath); // temp dosyayı sil
            console.log(
              `\nAudio file successfully converted to mp3: ${outputPath}`
            );
            resolve();
          })
          .on("error", (err) => {
            console.error("\nffmpeg error:", err);
            reject(err);
          });
      });
    }
  } catch (error) {
    console.error(
      "An error occurred during the process:",
      error.message || error
    );
  }
}
