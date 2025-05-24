import inquirer from 'inquirer';
import { downloadVideo } from './download.js';
import { getAvailableResolutions } from './formats.js';

type Container = 'mp4' | 'mp3';

async function main(): Promise<void> {
  while (true) {
    try {
      const { url }: { url: string } = await inquirer.prompt([
        {
          type: 'input',
          name: 'url',
          message: 'Enter YouTube video URL (Leave empty to exit):',
        },
      ]);

      if (!url.trim()) {
        console.log('Exiting, see you!');
        break;
      }

      const { container }: { container: Container } = await inquirer.prompt([
        {
          type: 'list',
          name: 'container',
          message: 'Select container:',
          choices: ['mp4', 'mp3'],
        },
      ]);

      let resolution: string | null = null;
      let frequency: string | null = null;

      if (container === 'mp4') {
        let uniqueResolutions: string[] = [];
        try {
          uniqueResolutions = await getAvailableResolutions(url);

          if (uniqueResolutions.length === 0) {
            console.log('No mp4 muxed resolutions found for this video.');
            continue;
          }
        } catch (e: any) {
          console.log('Error fetching resolutions:', e.message || e);
          continue;
        }

        const { chosenResolution }: { chosenResolution: string } = await inquirer.prompt([
          {
            type: 'list',
            name: 'chosenResolution',
            message: 'Select resolution:',
            choices: uniqueResolutions,
            default: uniqueResolutions[0],
          },
        ]);

        resolution = chosenResolution;
      } else {
        const frequencies = ['44100 Hz', '48000 Hz', '96000 Hz'];

        const { chosenFrequency }: { chosenFrequency: string } = await inquirer.prompt([
          {
            type: 'list',
            name: 'chosenFrequency',
            message: 'Select audio frequency:',
            choices: frequencies,
            default: frequencies[0],
          },
        ]);

        frequency = chosenFrequency;
      }

      const { savePath }: { savePath: string } = await inquirer.prompt([
        {
          type: 'input',
          name: 'savePath',
          message: 'Enter the full path to save the file (folder or full filename):',
          default: './output',
        },
      ]);

      await downloadVideo(url, container, resolution, frequency, savePath);

      break;

    } catch (error) {
      console.log('Caught an error:', error);
      break;
    }
  }
}

main();
