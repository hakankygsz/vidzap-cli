import inquirer from 'inquirer';
import { downloadVideo } from './download.js';
import { getAvailableResolutions } from './formats.js';

async function main() {
  while (true) {
    try {
      const { url } = await inquirer.prompt([
        {
          type: "input",
          name: "url",
          message: "YouTube video URL gir (Çıkmak için boş bırak):",
        },
      ]);

      if (!url.trim()) {
        console.log("Çıkış yapılıyor, görüşürüz!");
        break;
      }

      const { container } = await inquirer.prompt([
        {
          type: "list",
          name: "container",
          message: "Container seç:",
          choices: ["mp4", "mp3"],
        },
      ]);

      let resolution = null;

      if (container === "mp4") {
        let uniqueResolutions = [];
        try {
          uniqueResolutions = await getAvailableResolutions(url);

          if (uniqueResolutions.length === 0) {
            console.log("Bu video için mp4 muxed formatlarda çözünürlük bulunamadı.");
            continue;
          }
        } catch (e) {
          console.log("Çözünürlük alınırken hata:", e.message);
          continue;
        }

        const { chosenResolution } = await inquirer.prompt([
          {
            type: "list",
            name: "chosenResolution",
            message: "Çözünürlük seç:",
            choices: uniqueResolutions,
            default: uniqueResolutions[0],
          },
        ]);

        resolution = chosenResolution;
      }

      await downloadVideo(url, container, resolution);
      break;
    } catch (error) {
      console.log("Hata yakalandı:", error);
      break;
    }
  }
}

main();
