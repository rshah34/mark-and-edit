# Mark & Edit

## AI Attribution

The majority of this codebase was generated and iteratively edited with help from **ChatGPT (OpenAI)**, then reviewed and adjusted by our team.

## Run Locally

```bash
npm install
npm run dev
```

After starting the dev server, open the local URL shown in the terminal.

## Routes

- `/hello-world`
- `/hello-styles`
- `/prototype`

## Current Prototype Behavior

### 1) Hello World
1. Go to `/hello-world`.
2. Show the page rendering `Hello World`.

### 2) Hello Styles
1. Go to `/hello-styles`.
2. Show dark theme colors, marker color swatches (blue/red/orange/green), marker icons, and Inter font-weight samples.

### 3) Video Playback + Real-Time Interaction
1. Go to `/prototype`.
2. Click `Upload Clip` and choose a local video file.
3. Press play, pause, and scrub with the timeline slider.
4. While playing, press `L`, `X`, and `C` to create markers without interrupting playback.

### 4) Real-Time Marker Creation
1. During playback, create multiple markers with:
   - `L` for length
   - `X` for audio
   - `C` for caption
2. See marker count increasing in the status row.

### 5) Timeline + Marker Display
1. Add markers while the video is playing.
2. Use the timeline to see marker positions at their relative timestamps.
3. Marker types are color-coded.
4. Resolved markers remain on the timeline and are shown as filled markers.

### 6) Marker Interaction + Navigation
1. Click different timeline markers.
2. See video seeks to each marker time.
3. See navigation across multiple markers without breaking playback.

### 7) Basic Edit Actions Per Marker
1. Select a marker from timeline.
2. Use actions:
   - length: cut segment, or choose `speed up`/`slow down`, then enter `1-5` levels and click `Apply`
   - audio: mute audio, or choose `increase`/`decrease`, then enter `1-5` levels and click `Apply`
   - caption: enter text + display range + position (top/middle/bottom) + save
3. Use `Delete marker` to remove a selected marker.
4. Use `Undo Last Marker` to remove the most recently created marker that still exists.
5. Show open/resolved/skipped counts and marker state changes.

### 8) Export
1. Resolve or delete all open markers.
2. Click `Start final playback`.
3. Click `Download Completed Video`.
4. Export includes currently implemented edit effects from resolved markers (e.g., length/caption/audio actions supported by the current export path).
