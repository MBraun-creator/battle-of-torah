# Updating the tutorial video

The website's Watch Tutorial button plays `tutorial.mp4` from the same folder as `index.html`. No separate backend or paid video service is required.

1. Prepare an MP4 video with H.264 video and AAC audio for Safari compatibility. Use a compressed file under 25 MB for GitHub's browser uploader.
2. Open the repository on GitHub, choose **Add file → Upload files**, and upload the file named exactly `tutorial.mp4` at the root (next to `index.html`). To update it later, upload a replacement with the same name.
3. Follow the normal preview/review and approval workflow before merging or committing to the published branch. Uploading to the published branch changes the live tutorial.
4. After the GitHub Pages deployment completes, open the website, click **Watch Tutorial**, and press Play. Check the audio too. Closing the tutorial stops playback.

The repository currently contains no tutorial video. Until one is uploaded, the player shows a friendly unavailable message. A standalone downloaded HTML preview also needs `tutorial.mp4` beside it to play the video locally.
