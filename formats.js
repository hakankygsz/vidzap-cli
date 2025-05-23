import ytdl from "@distube/ytdl-core";

export async function getAvailableResolutions(url) {
  if (!ytdl.validateURL(url)) {
    throw new Error("This URL is not valid.");
  }

  const info = await ytdl.getInfo(url);

  const formatsMuxed = ytdl
    .filterFormats(info.formats, "video")
    .filter((f) => f.container === "mp4");

  const uniqueResolutions = [
    ...new Set(
      formatsMuxed
        .map((f) => f.qualityLabel)
        .filter((q) => q != null)
    ),
  ];

  return uniqueResolutions;
}
