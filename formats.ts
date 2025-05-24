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
