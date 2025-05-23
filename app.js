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
          message: "Enter YouTube video URL (Leave empty to exit):",
        },
      ]);

      if (!url.trim()) {
        console.log("Exiting, see you!");
        break;
      }

      const { container } = await inquirer.prompt([
        {
          type: "list",
          name: "container",
          message: "Select container:",
          choices: ["mp4", "mp3"],
        },
      ]);

      let resolution = null;

      if (container === "mp4") {
        let uniqueResolutions = [];
        try {
          uniqueResolutions = await getAvailableResolutions(url);

          if (uniqueResolutions.length === 0) {
            console.log("No mp4 muxed resolutions found for this video.");
            continue;
          }
        } catch (e) {
          console.log("Error fetching resolutions:", e.message);
          continue;
        }

        const { chosenResolution } = await inquirer.prompt([
          {
            type: "list",
            name: "chosenResolution",
            message: "Select resolution:",
            choices: uniqueResolutions,
            default: uniqueResolutions[0],
          },
        ]);

        resolution = chosenResolution;
      }

      await downloadVideo(url, container, resolution);
      break;
    } catch (error) {
      console.log("Caught an error:", error);
      break;
    }
  }
}

main();
