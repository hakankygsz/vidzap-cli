
# Vidzap CLI

Vidzap CLI is a lightweight command-line tool for downloading YouTube videos and audio in your preferred format and resolution. It supports MP4 video downloads with selectable resolutions and MP3 audio extraction.

## Features

- Download YouTube videos as MP4 files with selectable resolution.
- Download audio only as MP3.
- Interactive command-line prompts for URL, format, and resolution.
- Automatic handling of muxed or separate audio/video streams.
- Easy to use and lightweight.

## Requirements

- Node.js (v14+ recommended)
- ffmpeg installed and accessible in your system PATH.
- npm packages:
  - inquirer
  - @distube/ytdl-core
  - fluent-ffmpeg

## Installation

1. Clone or download the repository.
2. Run `npm install` to install dependencies.
3. Make sure `ffmpeg` is installed on your system and available in PATH.

## Usage

Run the CLI tool:

```bash
node app.js
```

Follow the interactive prompts:

- Enter the YouTube video URL.
- Choose the container format (`mp4` or `mp3`).
- If `mp4` selected, choose the video resolution.

The downloaded file will be saved in the same directory with the video title as filename.

## Notes

- Only mp4 and mp3 formats are supported.
- If the video doesn't have muxed formats for the selected resolution, video and audio streams will be downloaded separately and merged.
- ffmpeg is required for audio conversion and merging.

## License

MIT License.

---

Made with ❤️ by Vidzap CLI.
