import cliProgress from "cli-progress";

const bar = new cliProgress.SingleBar({
  format: 'Download [{bar}] {percentage}% | {value}/{total} bytes',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true
}, cliProgress.Presets.shades_classic);

let barStarted = false;

export function updateProgress(downloaded, total) {
  if (!barStarted) {
    bar.start(total, 0);
    barStarted = true;
  }
  bar.update(downloaded);
}

export function stopBar() {
  if (barStarted) {
    bar.stop();
    barStarted = false;
  }
}

export default bar;