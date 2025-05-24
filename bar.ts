import cliProgress from "cli-progress";
import chalk from "chalk";

const bar = new cliProgress.SingleBar({
  format: `${chalk.cyan('Downloading')} |${chalk.green('{bar}')}| {percentage}% | {value}/{total} bytes | {speed} KB/s | ETA: {eta_formatted}`,
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true,
  fps: 20,
  barsize: 30,
  linewrap: true
}, cliProgress.Presets.shades_classic);

let barStarted = false;
let lastTime = 0;
let lastValue = 0;

interface ProgressPayload {
  speed: string;
  eta_formatted: string;
}

export function updateProgress(downloaded: number, total: number): void {
  if (!barStarted) {
    bar.start(total, 0, {
      speed: "0.00",
      eta_formatted: "N/A"
    } as ProgressPayload);
    barStarted = true;
    lastTime = Date.now();
    lastValue = 0;
  }

  const now = Date.now();
  const elapsed = (now - lastTime) / 1000; // saniye
  const delta = downloaded - lastValue;

  // Hız KB/s cinsinden
  const speed = elapsed > 0 ? (delta / 1024 / elapsed).toFixed(2) : "0.00";

  lastTime = now;
  lastValue = downloaded;

  // Kalan süre tahmini: kalan byte / hız
  const eta = parseFloat(speed) > 0 ? ((total - downloaded) / 1024 / parseFloat(speed)) : 0;
  const etaFormatted = new Date(eta * 1000).toISOString().substr(11, 8);

  bar.update(downloaded, {
    speed,
    eta_formatted: etaFormatted
  } as ProgressPayload);
}

export function stopBar(): void {
  if (barStarted) {
    bar.stop();
    barStarted = false;
    lastTime = 0;
    lastValue = 0;
  }
}

export default bar;
