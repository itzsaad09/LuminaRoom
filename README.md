# LuminaRoom

A classy, ambient dark music room theater view with neon canvas visualizers for YouTube.

## Features

- **Ambient Neon Visualizer**: Real-time wave visualizer that reacts to the audio playing on YouTube.
- **Glassmorphism UI**: Beautiful, premium frosted glass cards and settings panels.
- **Custom Color Palettes**: Choose between Neon Pink & Cyan, Sunset Gold, Emerald Aurora, or an RGB Cycle.
- **Video Background Mode**: Seamlessly pull the YouTube video frame behind the visualizer in full screen with adjustable opacity and blur.
- **Playback Controls**: Play/Pause, Seek (+5s/-5s), Mute, and interactive seek bar directly in the LuminaRoom overlay.
- **Non-Intrusive**: Hooks into the YouTube player without modifying global attributes that cause buffering.

## Installation

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top right corner.
4. Click **Load unpacked** and select the `LuminaRoom` directory.
5. The LuminaRoom extension should now appear in your list of active extensions.

## Usage

1. Go to any YouTube video (e.g., `https://www.youtube.com/watch?v=...`).
2. Click the LuminaRoom icon in your extensions tray, or click the "LuminaRoom" button injected beneath the video player.
3. The video will transition into an ambient theater room. 
4. Click **Settings** in the overlay to adjust:
   - **Glass Blur Intensity**
   - **Color Palette**
   - **Show Video Background** (with independent video opacity/blur controls)

## Architecture

- Uses `chrome.storage.local` to persist settings.
- Employs Shadow DOM to encapsulate CSS and prevent conflicts with YouTube's styles.
- Utilizes the Web Audio API (`AnalyserNode`) combined with a procedural wave generator fallback if cross-origin restrictions apply.
- Leverages the `<canvas>` API for 60fps high-performance drawing.

## Credits

Created by Hafiz Muhammad Saad.
