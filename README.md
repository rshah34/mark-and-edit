# Mark & Edit

Implementation prototypes for A5.

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

## How To Reproduce Evidence Clips

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
4. While playing, tap on the video and press `C`, `X`, or `L` to show interaction does not interrupt playback.

### 4) Real-Time Marker Creation
1. During playback, create multiple markers with:
   - tap / `L` for length
   - shift + tap / `X` for audio
   - `C` for caption
2. See marker count increasing in the status row.

### 5) Timeline Generation + Visual Markers
1. Continue playback while marking.
2. See open timeline markers appearing at relative positions.
3. See color/icon differences by marker type.

### 6) Marker Interaction + Navigation
1. Click different timeline markers.
2. See video seeks to each marker time.
3. See navigation across multiple markers without breaking playback.

### 7) Basic Edit Actions Per Marker
1. Select a marker from timeline.
2. Use actions:
   - length: cut segment / speed up segment / slow down segment
   - audio: mute audio, or choose `increase`/`decrease`, then enter `1-10` levels and click `Apply`
   - caption: enter text + display range + save
3. Use `Keep as-is (skip)` when needed.
4. Show open/resolved/skipped counts updating and marker state changes.

### 8) UI State Transitions
1. Show mode transitions in the top status row:
   - `watching` -> `marking` -> `editing` -> `finalPlayback`.
2. Show timeline and editing controls appear in appropriate states.
