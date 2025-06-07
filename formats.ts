import ytdl, { videoFormat, videoInfo } from "@distube/ytdl-core";

export async function getAvailableResolutions(url: string): Promise<string[]> {
  if (!ytdl.validateURL(url)) {
    throw new Error("This URL is not valid.");
  }

  const info: videoInfo = await ytdl.getInfo(url);

  const formatsMuxed: videoFormat[] = ytdl
    .filterFormats(info.formats, "video")
    .filter((f) => f.container === "mp4");

  const uniqueResolutions: string[] = Array.from(
    new Set(
      formatsMuxed
        .map((f) => f.qualityLabel)
        .filter((q): q is Exclude<typeof q, null | undefined> => q != null)
    )
  );

  return uniqueResolutions;
}

export async function getAvailableFrequencies(videoUrl) {
  const info = await ytdl.getInfo(videoUrl);
  const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

  // Frekansları çıkar ve tekrar edenleri filtrele
  const uniqueFrequencies = Array.from(
    new Set(audioFormats.map(f => `${f.audioSampleRate} Hz`).filter(Boolean))
  );

  return uniqueFrequencies;
}
