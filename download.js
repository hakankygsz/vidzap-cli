import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function downloadVideo(url, container, resolution) {
  if (!ytdl.validateURL(url)) {
    console.log("Bu URL geçerli değil, adam gibi bir link gir.");
    return;
  }

  const info = await ytdl.getInfo(url);
  const title = info.videoDetails.title.replace(/[\/\\?%*:|"<>]/g, "-");
  const outputPath = path.resolve(__dirname, `${title}.${container}`);

  console.log(`İndiriliyor: ${title}`);

  if (container === "mp4") {
    const formatsMuxed = ytdl
      .filterFormats(info.formats, "videoandaudio")
      .filter((f) => f.container === "mp4");

    const formatsVideoOnly = ytdl
      .filterFormats(info.formats, "videoonly")
      .filter((f) => f.container === "mp4");

    const formatsAudioOnly = ytdl.filterFormats(info.formats, "audioonly");

    let format = formatsMuxed.find((f) => f.qualityLabel === resolution);

    if (format) {
      ytdl(url, { format: format })
        .pipe(fs.createWriteStream(outputPath))
        .on("finish", () => {
          console.log(`Video başarıyla indirildi: ${outputPath}`);
        })
        .on("error", (err) => {
          console.log("Video indirirken hata çıktı:", err);
        });
    } else {
      const videoFormat = formatsVideoOnly.find((f) => f.qualityLabel === resolution);
      const audioFormat = formatsAudioOnly.find(
        (f) => f.audioBitrate === Math.max(...formatsAudioOnly.map((f) => f.audioBitrate))
      );

      if (!videoFormat || !audioFormat) {
        console.log("İstenen çözünürlükte video ya da uygun ses bulunamadı.");
        return;
      }

      const videoStream = ytdl(url, { format: videoFormat });
      const audioStream = ytdl(url, { format: audioFormat });

      const tempVideoPath = path.resolve(__dirname, "temp-video.mp4");
      const tempAudioPath = path.resolve(__dirname, "temp-audio.mp4");

      await Promise.all([
        new Promise((res, rej) => {
          videoStream.pipe(fs.createWriteStream(tempVideoPath)).on("finish", res).on("error", rej);
        }),
        new Promise((res, rej) => {
          audioStream.pipe(fs.createWriteStream(tempAudioPath)).on("finish", res).on("error", rej);
        }),
      ]);

      ffmpeg()
        .input(tempVideoPath)
        .input(tempAudioPath)
        .outputOptions([
          "-c:v copy",
          "-c:a aac",
          "-strict experimental",
        ])
        .save(outputPath)
        .on("end", () => {
          fs.unlinkSync(tempVideoPath);
          fs.unlinkSync(tempAudioPath);
          console.log(`Video ve ses başarıyla birleştirildi: ${outputPath}`);
        })
        .on("error", (err) => {
          console.log("Birleştirme sırasında hata:", err);
        });
    }
  } else if (container === "mp3") {
    const stream = ytdl(url, { quality: "highestaudio" });

    ffmpeg(stream)
      .audioBitrate(128)
      .save(outputPath)
      .on("end", () => {
        console.log(`Ses başarıyla indirildi ve mp3 yapıldı: ${outputPath}`);
      })
      .on("error", (err) => {
        console.log("Ses indirirken/dönüştürürken hata:", err);
      });
  } else {
    console.log("Container olarak sadece mp4 veya mp3 kabul ediliyor.");
  }
}
