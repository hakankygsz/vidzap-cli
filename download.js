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

function getAvailableFilename(basePath) {
  if (!fs.existsSync(basePath)) return basePath;

  const ext = path.extname(basePath);
  const name = path.basename(basePath, ext);
  const dir = path.dirname(basePath);

  for (let i = 1; i < 100; i++) {
    const newName = path.join(dir, `${name} (${i})${ext}`);
    if (!fs.existsSync(newName)) return newName;
  }
  throw new Error("Dosya ismi bulamadım 100 denemede de, bir şeyler çok kötü.");
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
  return new Promise((res, rej) => {
    if (typeof totalBytes === "number") {
      let downloaded = 0;
      stream.on("data", (chunk) => {
        downloaded += chunk.length;
        updateProgress(downloaded, totalBytes);
      });
    }

    stream
      .pipe(fs.createWriteStream(filepath))
      .on("finish", res)
      .on("error", rej);
  });
}

export async function downloadVideo(
  url,
  container = "mp4",
  resolution = "720p",
  mp3Bitrate = 128
) {
  try {
    if (!ytdl.validateURL(url)) {
      console.log("Dostum, bu link boktan, düzgün bir tane at.");
      return;
    }

    const info = await ytdl.getInfo(url);

    // Platforma uyumlu dosya adı
    const cleanTitle = sanitizeFilename(info.videoDetails.title);
    const baseOutputPath = path.resolve(
      __dirname,
      `${cleanTitle}.${container}`
    );
    const outputPath = getAvailableFilename(baseOutputPath);

    if (container === "mp4") {
      const formatsMuxed = ytdl
        .filterFormats(info.formats, "videoandaudio")
        .filter((f) => f.container === "mp4");
      const formatsVideoOnly = ytdl
        .filterFormats(info.formats, "videoonly")
        .filter((f) => f.container === "mp4");
      const formatsAudioOnly = ytdl.filterFormats(info.formats, "audioonly");

      let format = formatsMuxed.find((f) => f.qualityLabel === resolution);

      if (!format) {
        format = findClosestResolution(formatsVideoOnly, resolution);
        if (!format) throw new Error("Uygun video çözünürlüğü yok, pes ettim.");

        const audioFormat = formatsAudioOnly.reduce(
          (prev, curr) => (curr.audioBitrate > prev.audioBitrate ? curr : prev),
          formatsAudioOnly[0]
        );

        if (!audioFormat)
          throw new Error("Ses kalitesi yüksek bir format bulunamadı.");

        console.log(
          `Muxed format yok, video-only: ${format.qualityLabel}, ses: ${audioFormat.audioBitrate} kbps indirilecek.`
        );

        const tempVideoPath = path.resolve(
          __dirname,
          `temp-video-${Date.now()}.mp4`
        );
        const tempAudioPath = path.resolve(
          __dirname,
          `temp-audio-${Date.now()}.mp4`
        );

        await Promise.all([
            await streamToFile(ytdl(url, { format }), tempVideoPath, parseInt(format.contentLength)),
            await streamToFile(ytdl(url, { format: audioFormat }), tempAudioPath, parseInt(audioFormat.contentLength))
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
                `Video ve ses başarıyla birleştirildi: ${outputPath}`
              );
              resolve();
            })
            .on("error", (err) => {
              console.log("Birleştirme sırasında hata:", err);
              reject(err);
            });
        });
      } else {
        const videoStream = ytdl(url, { format });
        videoStream.on(
          "progress",
          (chunkLength, downloadedBytes, totalBytes) => {
            updateProgress(downloadedBytes, totalBytes);
          }
        );

        await streamToFile(videoStream, outputPath);
        bar.stop();
        console.log(`Video başarıyla indirildi: ${outputPath}`);
      }
    } else if (container === "mp3") {
      const audioStream = ytdl(url, { quality: "highestaudio" });
      console.log(
        `Ses indiriliyor, bitrate: ${mp3Bitrate}kbps, sample rate: ${sampleRate} Hz`
      );

      await new Promise((res, rej) => {
        ffmpeg(audioStream)
          .audioBitrate(mp3Bitrate)
          .audioFrequency(sampleRate)
          .format("mp3")
          .save(outputPath)
          .on("end", () => {
            console.log(`Ses indirildi ve mp3 yapıldı: ${outputPath}`);
            res();
          })
          .on("error", (err) => rej(err));
      });
    } else {
      console.log("Sadece mp4 ya da mp3 formatları destekleniyor.");
    }
  } catch (error) {
    console.error("Bir hata çıktı abi:", error.message || error);
  }
}
