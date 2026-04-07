import { ChangeEvent, MouseEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Circle,
  Download,
  Keyboard,
  Pause,
  Play,
  Scissors,
  Type,
  Upload,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { formatTime } from "../lib/time";
import { Marker, MarkerType, UIMode } from "../types/prototype";

const guide = [
  {
    key: "Tap / L",
    detail: "Length edit marker",
    icon: <Circle size={14} />,
    className: "is-length",
  },
  {
    key: "Shift + Tap / X",
    detail: "Audio/Visual edit marker",
    icon: <Scissors size={14} />,
    className: "is-edit",
  },
  {
    key: "C",
    detail: "Caption marker",
    icon: <Type size={14} />,
    className: "is-caption",
  },
];

function markerClass(type: MarkerType): string {
  if (type === "length") return "is-length";
  if (type === "audioVisual") return "is-edit";
  return "is-caption";
}

function markerLabel(type: MarkerType): string {
  if (type === "length") return "Length";
  if (type === "audioVisual") return "Audio/Visual";
  return "Caption";
}

export function PrototypePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pendingSeekStartMs = useRef<number | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [mode, setMode] = useState<UIMode>("landing");
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [captionInput, setCaptionInput] = useState("");
  const [captionDuration, setCaptionDuration] = useState(2);
  const [durationUnit, setDurationUnit] = useState<"ms" | "s" | "min">("s");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const selectedMarker = useMemo(
    () => markers.find((m) => m.id === selectedMarkerId) ?? null,
    [markers, selectedMarkerId],
  );
  const showTimeline = markers.length > 0 && ["marking", "editing", "finalPlayback"].includes(mode);
  const showTimelineActions = mode === "editing" || mode === "finalPlayback";
  const timelineMarkers = markers.filter((m) => m.status === "open");

  const openCount = markers.filter((m) => m.status === "open").length;
  const resolvedCount = markers.filter((m) => m.status === "resolved").length;
  const skippedCount = markers.filter((m) => m.status === "skipped").length;
  const canDownloadCompletedVideo =
    Boolean(videoUrl) && markers.length > 0 && openCount === 0 && showTimelineActions;

  const activeCaption = markers.find(
    (m) =>
      m.status === "resolved" &&
      m.type === "caption" &&
      m.note &&
      currentTime >= m.tSec &&
      currentTime <= m.tSec + (m.durationSec ?? 2)
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => setFeedback(null), 1200);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!["watching", "marking", "editing"].includes(mode)) return;
      const activeTag = (event.target as HTMLElement | null)?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

      if (event.key.toLowerCase() === "c") {
        addMarker("caption");
      }
      if (event.key.toLowerCase() === "x") {
        addMarker("audioVisual");
      }
      if (event.key.toLowerCase() === "l") {
        addMarker("length");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, currentTime]);

  useEffect(() => {
    if (!selectedMarkerId) return;
    const marker = markers.find((m) => m.id === selectedMarkerId);
    const video = videoRef.current;
    if (!marker || !video) return;

    video.pause();
    setIsPlaying(false);
    if (Math.abs(video.currentTime - marker.tSec) > 0.03) {
      video.currentTime = marker.tSec;
    }
    setCurrentTime(marker.tSec);
  }, [selectedMarkerId]);

  function resetSession() {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setVideoUrl(null);
    setUploadedFileName("");
    setMode("landing");
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);
    setMarkers([]);
    setSelectedMarkerId(null);
    setCaptionInput("");
    setFeedback(null);
    setErrorText(null);
    pendingSeekStartMs.current = null;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }

  function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    const objectUrl = URL.createObjectURL(file);
    setVideoUrl(objectUrl);
    setUploadedFileName(file.name);
    setMode("watching");
    setMarkers([]);
    setSelectedMarkerId(null);
    setCurrentTime(0);
    setDuration(0);
    setErrorText(null);
    setFeedback("Video loaded. Press play to begin marking.");
  }

  function buildCompletedFileName(): string {
    const fallback = "mark-and-edit-completed.webm";
    if (!uploadedFileName) return fallback;
    const dot = uploadedFileName.lastIndexOf(".");
    if (dot <= 0) return uploadedFileName + "-completed.webm";
    const base = uploadedFileName.slice(0, dot);
    return `${base}-completed.webm`;
  }

  function getSupportedExportMimeType(): string {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const mime of candidates) {
      if (MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }
    return "";
  }

  async function downloadCompletedVideo() {
    if (!videoUrl || !canDownloadCompletedVideo) {
      setErrorText("Resolve all markers in editing mode before downloading.");
      return;
    }
    if (isExporting) return;

    const mimeType = getSupportedExportMimeType();
    if (!mimeType) {
      setErrorText("Browser does not support video export in this prototype.");
      return;
    }

    setIsExporting(true);
    setErrorText(null);
    setFeedback("Exporting edited video...");

    const sourceVideo = document.createElement("video");
    sourceVideo.src = videoUrl;
    sourceVideo.preload = "auto";
    sourceVideo.muted = true;
    sourceVideo.playsInline = true;

    try {
      await new Promise<void>((resolve, reject) => {
        sourceVideo.onloadedmetadata = () => resolve();
        sourceVideo.onerror = () => reject(new Error("Failed to load source video for export."));
      });

      const width = sourceVideo.videoWidth || 1280;
      const height = sourceVideo.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Unable to create export canvas.");
      }

      const stream = canvas.captureStream(30);
      const mediaCapture = (sourceVideo as HTMLVideoElement & {
        captureStream?: () => MediaStream;
        mozCaptureStream?: () => MediaStream;
      });
      const audioStream =
        mediaCapture.captureStream?.() ?? mediaCapture.mozCaptureStream?.();
      if (audioStream) {
        for (const audioTrack of audioStream.getAudioTracks()) {
          stream.addTrack(audioTrack);
        }
      }

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      const stopPromise = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start();
      await sourceVideo.play();

      await new Promise<void>((resolve) => {
        let rafId = 0;

        const drawFrame = () => {
          ctx.drawImage(sourceVideo, 0, 0, width, height);

          const t = sourceVideo.currentTime;
          const caption = markers.find(
            (m) =>
              m.status === "resolved" &&
              m.type === "caption" &&
              m.note &&
              t >= m.tSec &&
              t <= m.tSec + (m.durationSec ?? 2),
          );

          if (caption?.note) {
            ctx.save();
            ctx.font = `${Math.max(18, Math.round(height * 0.04))}px Inter, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
            ctx.lineWidth = 5;
            const x = width / 2;
            const y = height - Math.max(40, Math.round(height * 0.08));
            ctx.strokeText(caption.note, x, y);
            ctx.fillText(caption.note, x, y);
            ctx.restore();
          }

          if (sourceVideo.ended) {
            resolve();
            return;
          }
          rafId = window.requestAnimationFrame(drawFrame);
        };

        sourceVideo.onended = () => {
          window.cancelAnimationFrame(rafId);
          resolve();
        };
        drawFrame();
      });

      recorder.stop();
      await stopPromise;

      for (const track of stream.getTracks()) {
        track.stop();
      }

      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildCompletedFileName();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setFeedback("Edited video downloaded.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export edited video.";
      setErrorText(message);
    } finally {
      sourceVideo.pause();
      sourceVideo.removeAttribute("src");
      sourceVideo.load();
      setIsExporting(false);
    }
  }

  function addMarker(type: MarkerType) {
    const start = performance.now();
    const video = videoRef.current;
    if (!video) {
      setErrorText("Load a video before adding markers.");
      return;
    }
    if (!isPlaying) {
      setErrorText("Markers are created while playback is active.");
      return;
    }

    const marker: Marker = {
      id: "mk-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
      tSec: video.currentTime,
      type,
      status: "open",
      createdAtMs: Date.now(),
      inputToCreateDelayMs: performance.now() - start,
    };

    setMarkers((prev) => [...prev, marker]);
    setFeedback(markerLabel(type) + " marker at " + formatTime(marker.tSec));
    setErrorText(null);
    if (mode === "watching") setMode("marking");
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) {
      setErrorText("Upload a clip to start playback.");
      return;
    }

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      if (mode !== "editing") setMode("watching");
      return;
    }

    video
      .play()
      .then(() => {
        setIsPlaying(true);
        if (mode === "landing") setMode("watching");
        if (mode === "watching") setMode("marking");
      })
      .catch(() => {
        setErrorText("Playback could not start. Use an mp4 or mov clip.");
      });
  }

  function onVideoTap(event: MouseEvent<HTMLDivElement>) {
    if (!isPlaying || !videoUrl) return;
    if (event.shiftKey) {
      addMarker("audioVisual");
      return;
    }
    addMarker("length");
  }

  function onSelectMarker(marker: Marker) {
    const video = videoRef.current;
    if (!video) return;
    pendingSeekStartMs.current = performance.now();
    video.currentTime = marker.tSec;
    video.pause();
    setIsPlaying(false);
    setMode("editing");
    setCurrentTime(marker.tSec);
    setSelectedMarkerId(marker.id);
    setErrorText(null);
  }

  function onSeeked() {
    if (!selectedMarkerId || pendingSeekStartMs.current == null) return;
    const delta = performance.now() - pendingSeekStartMs.current;
    pendingSeekStartMs.current = null;
    setMarkers((prev) =>
      prev.map((m) => (m.id === selectedMarkerId ? { ...m, seekLatencyMs: delta } : m)),
    );
  }

  function resolveSelected(status: "resolved" | "skipped", note?: string) {
    if (!selectedMarker) return;

    if (selectedMarker.type === "caption" && status === "resolved" && !captionInput.trim()) {
      setErrorText("Caption text is required before saving.");
      return;
    }

    setMarkers((prev) =>
      prev.map((m) =>
        m.id === selectedMarker.id
          ? {
              ...m,
              status,
              note: note ?? (m.type === "caption" ? captionInput.trim() : undefined),
              durationSec:
                m.type === "caption"
                  ? durationUnit === "ms"
                    ? captionDuration / 1000
                    : durationUnit === "min"
                    ? captionDuration * 60
                    : captionDuration
                  : m.durationSec,
            }
          : m,
      ),
    );

    setFeedback(status === "resolved" ? "Marker resolved" : "Marker skipped");
    setCaptionInput("");
    setErrorText(null);

    const nextOpen = markers.find((m) => m.id !== selectedMarker.id && m.status === "open");
    setSelectedMarkerId(nextOpen ? nextOpen.id : null);
  }

  function startFinalPlayback() {
    const unresolved = markers.some((m) => m.status === "open");
    const video = videoRef.current;

    if (unresolved) {
      setErrorText("Resolve or skip all markers before final playback.");
      return;
    }
    if (!video) {
      setErrorText("No video available.");
      return;
    }

    video.currentTime = 0;
    setCurrentTime(0);
    setMode("finalPlayback");
    setSelectedMarkerId(null);
    setErrorText(null);
    video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }

  return (
    <section className="prototype-grid">
      <aside className="guide card">
        <h2>Interaction Guide</h2>
        <div className="guide-list">
          {guide.map((item) => (
            <div className="guide-item" key={item.key}>
              <span className={"marker-dot " + item.className}>{item.icon}</span>
              <p>
                <strong>{item.key}</strong>
                <span>{item.detail}</span>
              </p>
            </div>
          ))}
        </div>
        <p className="muted">Flow: watch - mark - edit markers - final playback.</p>

        <label className="upload-btn">
          <Upload size={16} />
          Upload Clip
          <input type="file" accept="video/*" onChange={onUpload} hidden />
        </label>

        <button className="ghost-btn" onClick={resetSession}>Exit to landing</button>
      </aside>

      <div className="editor-column">
        <div className="status-row card">
          <span>Mode: <strong>{mode}</strong></span>
          <span>Time: <strong>{formatTime(currentTime)}</strong></span>
          <span>Markers: <strong>{markers.length}</strong></span>
          <span>Open/Resolved/Skipped: <strong>{openCount}/{resolvedCount}/{skippedCount}</strong></span>
        </div>

        {errorText && (
          <div className="error-banner card">
            <AlertTriangle size={16} />
            <span>{errorText}</span>
            <button onClick={() => setErrorText(null)} aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="player-wrap card" onClick={onVideoTap}>
          {videoUrl ? (
            <div style={{ position: "relative" }}>
            <video
              ref={videoRef}
              src={videoUrl}
              onLoadedMetadata={(e) => {
                setDuration(e.currentTarget.duration || 0);
                setMode("watching");
              }}
              onTimeUpdate={(e) => {
                setCurrentTime(e.currentTarget.currentTime);
                if (!e.currentTarget.paused && mode !== "editing" && mode !== "finalPlayback") {
                  setMode("marking");
                }
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                if (mode === "finalPlayback") {
                  setMode("editing");
                  return;
                }
                setMode("editing");
                const firstOpen = markers.find((m) => m.status === "open");
                if (firstOpen) setSelectedMarkerId(firstOpen.id);
              }}
              onSeeked={onSeeked}
              className="video"
            />

            {activeCaption && (
              <div
                style={{
                  position: "absolute",
                  bottom: "40px",
                  width: "100%",
                  textAlign: "center",
                  color: "white",
                  fontSize: "20px",
                  fontWeight: "500",
                  textShadow: "0px 2px 8px rgba(0,0,0,0.8)",
                }}
              >
                {activeCaption.note}
              </div>
            )}
          </div>
          ) : (
            <div className="video-placeholder">
              <Play size={30} />
              <p>Upload a clip to begin</p>
              <p className="muted">Use taps and keypresses while the video is playing.</p>
            </div>
          )}

          {isPlaying && <span className="tap-hint">Tap to mark | <Keyboard size={14} /> C / X / L</span>}
        </div>

        <div className="controls card">
          <button className="icon-btn" onClick={togglePlayback}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <span className="time-readout">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.01}
            value={currentTime}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (!videoRef.current) return;
              videoRef.current.currentTime = next;
              setCurrentTime(next);
            }}
          />
          <span className="time-readout">{formatTime(duration)}</span>

          <button
            className="icon-btn"
            onClick={() => {
              if (!videoRef.current) return;
              const next = videoRef.current.volume > 0 ? 0 : 0.8;
              videoRef.current.volume = next;
              setVolume(next);
            }}
          >
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        </div>

        {showTimeline && (
          <div className="timeline card">
            <div className="timeline-head">
              <h3>Timeline</h3>
              <span>{timelineMarkers.length} open markers</span>
            </div>
            <div className="timeline-rail">
              {timelineMarkers.map((marker) => {
                const left = duration > 0 ? (marker.tSec / duration) * 100 : 0;
                const classes = ["timeline-marker", markerClass(marker.type)];
                if (marker.status !== "open") classes.push("is-dim");
                if (selectedMarkerId === marker.id) classes.push("is-selected");

                return (
                  <button
                    key={marker.id}
                    type="button"
                    className={classes.join(" ")}
                    style={{ left: left + "%" }}
                    onClick={() => onSelectMarker(marker)}
                    title={markerLabel(marker.type) + " @ " + formatTime(marker.tSec)}
                  />
                );
              })}
            </div>
            {showTimelineActions ? (
              <div className="timeline-actions">
                <button className="ghost-btn" onClick={() => setMode("watching")}>Back to watch mode</button>
                <div className="timeline-action-group">
                  <button className="primary-btn" onClick={startFinalPlayback}>Start final playback</button>
                  {canDownloadCompletedVideo && (
                    <button
                      className="primary-btn"
                      onClick={downloadCompletedVideo}
                      disabled={isExporting}
                    >
                      <Download size={16} />
                      {isExporting ? "Exporting..." : "Download Completed Video"}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="muted">Timeline updates live while you mark moments during playback.</p>
            )}
          </div>
        )}
      </div>

      <aside className="action-panel card">
        <h2>Marker Actions</h2>
        {!selectedMarker && <p className="muted">Select a timeline marker to edit it.</p>}

        {selectedMarker && (
          <>
            <p className="muted">
              {markerLabel(selectedMarker.type)} marker at {formatTime(selectedMarker.tSec)}
              {selectedMarker.seekLatencyMs ? " | seek " + selectedMarker.seekLatencyMs.toFixed(1) + "ms" : ""}
            </p>

            {selectedMarker.type === "caption" && (
              <>
                <textarea
                  className="caption-input"
                  value={captionInput}
                  onChange={(e) => setCaptionInput(e.target.value)}
                  placeholder="Caption text"
                />

                <div style={{ marginTop: "10px" }}>
                  <p className="muted caption-duration-label">Duration</p>

                  <div className="caption-duration-row">
                    <input
                      type="number"
                      min={0}
                      value={captionDuration}
                      onChange={(e) =>
                        setCaptionDuration(Math.max(0, Number(e.target.value)))
                      }
                      className="caption-duration-input"
                    />

                    <select
                      value={durationUnit}
                      onChange={(e) => setDurationUnit(e.target.value as "ms" | "s" | "min")}
                      className="caption-duration-select"
                    >
                      <option value="ms">ms</option>
                      <option value="s">s</option>
                      <option value="min">min</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="action-stack">
              {selectedMarker.type === "length" && (
                <>
                  <button className="primary-btn" onClick={() => resolveSelected("resolved", "tighten clip")}>Tighten clip</button>
                  <button className="ghost-btn" onClick={() => resolveSelected("resolved", "extend clip")}>Extend clip</button>
                </>
              )}

              {selectedMarker.type === "audioVisual" && (
                <>
                  <button className="primary-btn" onClick={() => resolveSelected("resolved", "delete segment")}>Delete segment</button>
                  <button className="ghost-btn" onClick={() => resolveSelected("skipped", "manual edit")}>Manual edit later</button>
                </>
              )}

              {selectedMarker.type === "caption" && (
                <button className="primary-btn" onClick={() => resolveSelected("resolved")}>Save caption</button>
              )}

              <button className="ghost-btn" onClick={() => resolveSelected("skipped", "kept")}>Keep as-is (skip)</button>
            </div>
          </>
        )}
      </aside>

      {feedback && <div className="feedback-toast">{feedback}</div>}
    </section>
  );
}
