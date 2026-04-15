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
import { AudioAction, LengthAction, Marker, MarkerStatus, MarkerType, UIMode } from "../types/prototype";

const guide = [
  {
    key: "Tap / L",
    detail: "Length edit marker",
    icon: <Circle size={14} />,
    className: "is-length",
  },
  {
    key: "Shift + Tap / X",
    detail: "Audio edit marker",
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
  if (type === "audioVisual") return "Audio";
  return "Caption";
}

export function PrototypePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pendingSeekStartMs = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [mode, setMode] = useState<UIMode>("landing");
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.6);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [captionInput, setCaptionInput] = useState("");
  const [captionDuration, setCaptionDuration] = useState(2);
  const [durationUnit, setDurationUnit] = useState<"ms" | "s" | "min">("s");
  const [lengthBeforeValue, setLengthBeforeValue] = useState(2);
  const [lengthBeforeUnit, setLengthBeforeUnit] = useState<"ms" | "s" | "min">("s");
  const [lengthAfterValue, setLengthAfterValue] = useState(2);
  const [lengthAfterUnit, setLengthAfterUnit] = useState<"ms" | "s" | "min">("s");
  const [audioDeltaLevels, setAudioDeltaLevels] = useState(3);
  const [pendingAudioAction, setPendingAudioAction] = useState<"increase" | "decrease" | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const selectedMarker = useMemo(
    () => markers.find((m) => m.id === selectedMarkerId) ?? null,
    [markers, selectedMarkerId],
  );
  const showTimeline = markers.length > 0 && ["marking", "editing", "finalPlayback"].includes(mode);
  const showTimelineActions = mode === "editing" || mode === "finalPlayback";
  const timelineMarkers = markers;

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
      m.startTimeSec !== undefined &&
      m.endTimeSec !== undefined &&
      currentTime >= m.startTimeSec &&
      currentTime <= m.endTimeSec
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


  useEffect(() => {
    if (!selectedMarker) return;

    if (selectedMarker.type === "length") {
      const beforeSec =
        selectedMarker.startTimeSec !== undefined
          ? Math.max(0, selectedMarker.tSec - selectedMarker.startTimeSec)
          : 2;

      const afterSec =
        selectedMarker.endTimeSec !== undefined
          ? Math.max(0, selectedMarker.endTimeSec - selectedMarker.tSec)
          : 2;

      setLengthBeforeValue(beforeSec);
      setLengthBeforeUnit("s");
      setLengthAfterValue(afterSec);
      setLengthAfterUnit("s");
    }

    if (selectedMarker.type === "caption") {
      setCaptionInput(selectedMarker.note ?? "");

      const beforeSec =
        selectedMarker.startTimeSec !== undefined
          ? Math.max(0, selectedMarker.tSec - selectedMarker.startTimeSec)
          : 2;

      const afterSec =
        selectedMarker.endTimeSec !== undefined
          ? Math.max(0, selectedMarker.endTimeSec - selectedMarker.tSec)
          : 2;

      setLengthBeforeValue(beforeSec);
      setLengthBeforeUnit("s");
      setLengthAfterValue(afterSec);
      setLengthAfterUnit("s");
    }

    if (selectedMarker.type === "audioVisual") {
      const beforeSec =
        selectedMarker.startTimeSec !== undefined
          ? Math.max(0, selectedMarker.tSec - selectedMarker.startTimeSec)
          : 2;

      const afterSec =
        selectedMarker.endTimeSec !== undefined
          ? Math.max(0, selectedMarker.endTimeSec - selectedMarker.tSec)
          : 2;

      setLengthBeforeValue(beforeSec);
      setLengthBeforeUnit("s");
      setLengthAfterValue(afterSec);
      setLengthAfterUnit("s");

      const delta = selectedMarker.audioDelta ?? 0.3;
      setAudioDeltaLevels(Math.max(1, Math.min(10, Math.round(delta * 10))));
    }
    setPendingAudioAction(null);
  }, [selectedMarker]);

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
    setLengthBeforeValue(2);
    setLengthBeforeUnit("s");
    setLengthAfterValue(2);
    setLengthAfterUnit("s");
    setAudioDeltaLevels(3);
    setPendingAudioAction(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const applyEdits = () => {
      const video = videoRef.current;
      if (!video) return;

      video.playbackRate = 1;
      video.volume = volume;

      const edit = getActiveLengthEdit(video.currentTime);

      if (edit?.lengthAction === "cut" && edit.endTimeSec !== undefined) {
        video.currentTime = edit.endTimeSec;
        return;
      }

      if (
        edit?.lengthAction === "speedUp" ||
        edit?.lengthAction === "slowDown"
      ) {
        video.playbackRate = edit.speedFactor ?? 1;
      }

      const audioEdit = getActiveAudioEdit(video.currentTime);

      video.volume = volume;

      if (audioEdit?.audioAction === "mute") {
        video.volume = 0;
      }

      if (audioEdit?.audioAction === "increase") {
        const delta = audioEdit.audioDelta ?? 0.3;
        video.volume = Math.min(1, volume + delta);
      }

      if (audioEdit?.audioAction === "decrease") {
        const delta = audioEdit.audioDelta ?? 0.3;
        video.volume = Math.max(0, volume - delta);
      }
    };

    video.addEventListener("timeupdate", applyEdits);

    return () => {
      video.removeEventListener("timeupdate", applyEdits);
    };
  }, [markers]);

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

  function getActiveLengthEdit(timeSec: number) {
    return markers.find(
      (m) =>
        m.type === "length" &&
        m.status === "resolved" &&
        m.lengthAction &&
        m.startTimeSec !== undefined &&
        m.endTimeSec !== undefined &&
        timeSec >= m.startTimeSec &&
        timeSec < m.endTimeSec,
    );
  }

  function getActiveAudioEdit(timeSec: number) {
    return markers.find(
      (m) =>
        m.type === "audioVisual" &&
        m.status === "resolved" &&
        m.audioAction &&
        m.startTimeSec !== undefined &&
        m.endTimeSec !== undefined &&
        timeSec >= m.startTimeSec &&
        timeSec <= m.endTimeSec
    );
  }

  function getCutRegions() {
    return markers.filter(
      (m) =>
        m.type === "length" &&
        m.status === "resolved" &&
        m.lengthAction === "cut" &&
        m.startTimeSec !== undefined &&
        m.endTimeSec !== undefined
    );
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
    sourceVideo.muted = false;
    sourceVideo.volume = volume;
    sourceVideo.playsInline = true;
    let exportAudioContext: AudioContext | null = null;
    let exportGainNode: GainNode | null = null;

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
      let addedAudioTrack = false;

      const audioWindow = window as Window & {
        webkitAudioContext?: typeof AudioContext;
      };
      const AudioContextCtor = window.AudioContext ?? audioWindow.webkitAudioContext;

      if (AudioContextCtor) {
        try {
          exportAudioContext = new AudioContextCtor();
          const sourceNode = exportAudioContext.createMediaElementSource(sourceVideo);
          exportGainNode = exportAudioContext.createGain();
          const destinationNode = exportAudioContext.createMediaStreamDestination();
          sourceNode.connect(exportGainNode);
          exportGainNode.connect(destinationNode);
          exportGainNode.gain.value = volume;

          for (const audioTrack of destinationNode.stream.getAudioTracks()) {
            stream.addTrack(audioTrack);
            addedAudioTrack = true;
          }

          if (exportAudioContext.state === "suspended") {
            await exportAudioContext.resume();
          }
        } catch {
          exportAudioContext = null;
          exportGainNode = null;
          addedAudioTrack = false;
        }
      }

      if (!addedAudioTrack) {
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
        let isJumpSeeking = false;

        const drawFrame = () => {
          if (sourceVideo.ended || sourceVideo.currentTime >= Math.max(0, sourceVideo.duration - 0.01)) {
            resolve();
            return;
          }

          if (sourceVideo.seeking || isJumpSeeking) {
            rafId = window.requestAnimationFrame(drawFrame);
            return;
          }

          const activeEdit = getActiveLengthEdit(sourceVideo.currentTime);

          if (activeEdit?.lengthAction === "cut" && activeEdit.endTimeSec !== undefined) {
            const jumpTarget = Math.min(activeEdit.endTimeSec, sourceVideo.duration || activeEdit.endTimeSec);
            if (Math.abs(sourceVideo.currentTime - jumpTarget) > 0.01) {
              isJumpSeeking = true;
              sourceVideo.currentTime = jumpTarget;
              const clearJump = () => {
                isJumpSeeking = false;
                sourceVideo.removeEventListener("seeked", clearJump);
              };
              sourceVideo.addEventListener("seeked", clearJump);
            }
            rafId = window.requestAnimationFrame(drawFrame);
            return;
          }

          if (
            activeEdit?.lengthAction === "speedUp" ||
            activeEdit?.lengthAction === "slowDown"
          ) {
            sourceVideo.playbackRate = activeEdit.speedFactor ?? 1;
          } else {
            sourceVideo.playbackRate = 1;
          }

          const activeAudioEdit = getActiveAudioEdit(sourceVideo.currentTime);
          let outputVolume = volume;
          if (activeAudioEdit?.audioAction === "mute") {
            outputVolume = 0;
          }
          if (activeAudioEdit?.audioAction === "increase") {
            const delta = activeAudioEdit.audioDelta ?? 0.3;
            outputVolume = Math.min(1, volume + delta);
          }
          if (activeAudioEdit?.audioAction === "decrease") {
            const delta = activeAudioEdit.audioDelta ?? 0.3;
            outputVolume = Math.max(0, volume - delta);
          }
          if (exportGainNode && exportAudioContext) {
            exportGainNode.gain.setValueAtTime(
              outputVolume,
              exportAudioContext.currentTime
            );
          } else {
            sourceVideo.volume = outputVolume;
          }

          ctx.drawImage(sourceVideo, 0, 0, width, height);

          const t = sourceVideo.currentTime;
          const caption = markers.find(
            (m) =>
              m.status === "resolved" &&
              m.type === "caption" &&
              m.note &&
              t >= m.startTimeSec! &&
              t <= m.endTimeSec!
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
      if (exportAudioContext) {
        void exportAudioContext.close();
      }
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

  function toSeconds(value: number, unit: "ms" | "s" | "min"): number {
    if (unit === "ms") return value / 1000;
    if (unit === "min") return value * 60;
    return value;
  }

  function applyLengthAction(action: LengthAction) {
    if (!selectedMarker || selectedMarker.type !== "length") return;

    const beforeSec = Math.max(0, toSeconds(lengthBeforeValue, lengthBeforeUnit));
    const afterSec = Math.max(0, toSeconds(lengthAfterValue, lengthAfterUnit));

    const startTimeSec = Math.max(0, selectedMarker.tSec - beforeSec);
    const endTimeSec = selectedMarker.tSec + afterSec;

    if (endTimeSec <= startTimeSec) {
      setErrorText("End of edit range must be after the start.");
      return;
    }

    setMarkers((prev) => {
      const updated = prev.map((m) =>
        m.id === selectedMarker.id
          ? {
              ...m,
              status: "resolved" as MarkerStatus,
              lengthAction: action,
              startTimeSec,
              endTimeSec,
              speedFactor:
                action === "speedUp"
                  ? 2
                  : action === "slowDown"
                  ? 0.5
                  : undefined,
            }
          : m
      );

      const nextOpen = updated.find(
        (m) => m.id !== selectedMarker.id && m.status === "open"
      );

      setSelectedMarkerId(nextOpen ? nextOpen.id : null);

      return updated;
    });

    setFeedback(
      action === "cut"
        ? "Length marker resolved: cut"
        : action === "speedUp"
        ? "Length marker resolved: speed up"
        : "Length marker resolved: slow down"
    );

    setErrorText(null);
  }

  function applyAudioAction(action: AudioAction, levels?: number) {
    if (!selectedMarker || selectedMarker.type !== "audioVisual") return;

    const beforeSec = Math.max(0, toSeconds(lengthBeforeValue, lengthBeforeUnit));
    const afterSec = Math.max(0, toSeconds(lengthAfterValue, lengthAfterUnit));

    const startTimeSec = Math.max(0, selectedMarker.tSec - beforeSec);
    const endTimeSec = selectedMarker.tSec + afterSec;

    if (endTimeSec <= startTimeSec) {
      setErrorText("End must be after start.");
      return;
    }

    const deltaLevels = Math.max(1, Math.min(10, levels ?? audioDeltaLevels));
    const delta = Math.max(0, Math.min(1, deltaLevels / 10));

    setMarkers((prev) => {
      const updated = prev.map((m) =>
        m.id === selectedMarker.id
          ? {
              ...m,
              status: "resolved" as MarkerStatus,
              audioAction: action,
              startTimeSec,
              endTimeSec,
              audioDelta: delta,
            }
          : m
      );

      const nextOpen = updated.find(
        (m) => m.id !== selectedMarker.id && m.status === "open"
      );

      // ✅ CRITICAL: set inside updater
      setSelectedMarkerId(nextOpen ? nextOpen.id : null);

      return updated;
    });

    setPendingAudioAction(null);

    const deltaLabel = Math.round(delta * 10);
    setFeedback(
      action === "mute"
        ? "Audio marker resolved: mute"
        : `Audio marker resolved: ${action} by ${deltaLabel} level${deltaLabel === 1 ? "" : "s"}`
    );

    setErrorText(null);
  }

  function resolveSelected(status: "resolved" | "skipped", note?: string) {
    if (!selectedMarker) return;

    if (
      selectedMarker.type === "caption" &&
      status === "resolved" &&
      !captionInput.trim()
    ) {
      setErrorText("Caption text is required before saving.");
      return;
    }

    setMarkers((prev) => {
      const updated = prev.map((m) => {
        if (m.id !== selectedMarker.id) return m;

        // ===== CAPTION RANGE LOGIC =====
        if (m.type === "caption" && status === "resolved") {
          const beforeSec = Math.max(
            0,
            toSeconds(lengthBeforeValue, lengthBeforeUnit)
          );
          const afterSec = Math.max(
            0,
            toSeconds(lengthAfterValue, lengthAfterUnit)
          );

          const startTimeSec = Math.max(0, m.tSec - beforeSec);
          const endTimeSec = m.tSec + afterSec;

          return {
            ...m,
            status,
            note: captionInput.trim(),
            startTimeSec,
            endTimeSec,
          };
        }

        return {
          ...m,
          status,
          note: note ?? undefined,
          lengthAction: status === "skipped" ? undefined : m.lengthAction,
          startTimeSec: status === "skipped" ? undefined : m.startTimeSec,
          endTimeSec: status === "skipped" ? undefined : m.endTimeSec,
          speedFactor: status === "skipped" ? undefined : m.speedFactor,
        };
      });

      // ✅ compute next open marker
      const nextOpen = updated.find(
        (m) => m.id !== selectedMarker.id && m.status === "open"
      );

      // ✅ set it HERE (inside updater)
      setSelectedMarkerId(nextOpen ? nextOpen.id : null);

      return updated;
    });

    setFeedback(status === "resolved" ? "Marker resolved" : "Marker skipped");
    setCaptionInput("");
    setErrorText(null);
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
        <p className="muted">Flow: Watching -&gt; Marking -&gt; Editing -&gt; Final playback.</p>

        <label className="upload-btn">
          <Upload size={16} />
          Upload Clip
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={onUpload}
            hidden
          />
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

              const cuts = getCutRegions();

              const cut = cuts.find(
                (c) => next >= c.startTimeSec! && next <= c.endTimeSec!
              );

              const safeTime = cut ? cut.endTimeSec! : next;

              videoRef.current.currentTime = safeTime;
              setCurrentTime(safeTime);
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
              <span>{openCount} open markers</span>
            </div>
            <div className="timeline-rail">
              {getCutRegions().map((cut, i) => {
                const safeStart = Math.max(0, Math.min(cut.startTimeSec!, duration));
                const safeEnd = Math.max(0, Math.min(cut.endTimeSec!, duration));

                const left = duration > 0 ? (safeStart / duration) * 100 : 0;
                const width =
                  duration > 0 ? ((safeEnd - safeStart) / duration) * 100 : 0;

                const clampedWidth = Math.max(0, Math.min(width, 100 - left));

                return (
                  <div
                    key={"cut-" + i}
                    style={{
                      position: "absolute",
                      left: `${left}%`,
                      width: `${clampedWidth}%`,
                      height: "100%",
                      background: "rgba(255, 0, 0, 0.25)",
                      pointerEvents: "none",
                    }}
                  />
                );
              })}
              {timelineMarkers.map((marker) => {
                const isDim = marker.status !== "open";

                const classes = [
                  "timeline-marker",
                  markerClass(marker.type),
                  isDim ? "is-dim" : "",
                  selectedMarkerId === marker.id ? "is-selected" : "",
                ];

                return (
                  <button
                    key={marker.id}
                    type="button"
                    className={classes.join(" ")}
                    style={{ left: `${(marker.tSec / duration) * 100}%` }}
                    onClick={() => onSelectMarker(marker)}
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
                  <p className="muted caption-duration-label">
                    Display range relative to marker
                  </p>

                  <div style={{ display: "grid", gap: "10px" }}>
                    <div>
                      <p className="muted caption-duration-label">Before marker</p>
                      <div className="caption-duration-row">
                        <input
                          type="number"
                          min={0}
                          value={lengthBeforeValue}
                          onChange={(e) =>
                            setLengthBeforeValue(Math.max(0, Number(e.target.value)))
                          }
                          className="caption-duration-input"
                        />

                        <select
                          value={lengthBeforeUnit}
                          onChange={(e) =>
                            setLengthBeforeUnit(e.target.value as "ms" | "s" | "min")
                          }
                          className="caption-duration-select"
                        >
                          <option value="ms">ms</option>
                          <option value="s">s</option>
                          <option value="min">min</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <p className="muted caption-duration-label">After marker</p>
                      <div className="caption-duration-row">
                        <input
                          type="number"
                          min={0}
                          value={lengthAfterValue}
                          onChange={(e) =>
                            setLengthAfterValue(Math.max(0, Number(e.target.value)))
                          }
                          className="caption-duration-input"
                        />

                        <select
                          value={lengthAfterUnit}
                          onChange={(e) =>
                            setLengthAfterUnit(e.target.value as "ms" | "s" | "min")
                          }
                          className="caption-duration-select"
                        >
                          <option value="ms">ms</option>
                          <option value="s">s</option>
                          <option value="min">min</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {selectedMarker.type === "length" && (
              <div style={{ marginTop: "10px" }}>
                <p className="muted caption-duration-label">Edit range relative to marker</p>

                <div style={{ display: "grid", gap: "10px" }}>
                  <div>
                    <p className="muted caption-duration-label">Before marker</p>
                    <div className="caption-duration-row">
                      <input
                        type="number"
                        min={0}
                        value={lengthBeforeValue}
                        onChange={(e) => setLengthBeforeValue(Math.max(0, Number(e.target.value)))}
                        className="caption-duration-input"
                      />

                      <select
                        value={lengthBeforeUnit}
                        onChange={(e) => setLengthBeforeUnit(e.target.value as "ms" | "s" | "min")}
                        className="caption-duration-select"
                      >
                        <option value="ms">ms</option>
                        <option value="s">s</option>
                        <option value="min">min</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <p className="muted caption-duration-label">After marker</p>
                    <div className="caption-duration-row">
                      <input
                        type="number"
                        min={0}
                        value={lengthAfterValue}
                        onChange={(e) => setLengthAfterValue(Math.max(0, Number(e.target.value)))}
                        className="caption-duration-input"
                      />

                      <select
                        value={lengthAfterUnit}
                        onChange={(e) => setLengthAfterUnit(e.target.value as "ms" | "s" | "min")}
                        className="caption-duration-select"
                      >
                        <option value="ms">ms</option>
                        <option value="s">s</option>
                        <option value="min">min</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="action-stack">
              {selectedMarker.type === "length" && (
                <>
                  {selectedMarker.type === "length" && (
                    <>
                      <button className="primary-btn" onClick={() => applyLengthAction("cut")}>
                        Cut segment
                      </button>
                      <button className="ghost-btn" onClick={() => applyLengthAction("speedUp")}>
                        Speed up segment
                      </button>
                      <button className="ghost-btn" onClick={() => applyLengthAction("slowDown")}>
                        Slow down segment
                      </button>
                    </>
                  )}
                </>
              )}

              {selectedMarker.type === "audioVisual" && (
                <>
                  <div style={{ marginTop: "10px" }}>
                    <p className="muted caption-duration-label">
                      Edit range relative to marker
                    </p>

                    <div style={{ display: "grid", gap: "10px" }}>
                      <div>
                        <p className="muted caption-duration-label">Before marker</p>
                        <div className="caption-duration-row">
                          <input
                            type="number"
                            min={0}
                            value={lengthBeforeValue}
                            onChange={(e) =>
                              setLengthBeforeValue(Math.max(0, Number(e.target.value)))
                            }
                            className="caption-duration-input"
                          />

                          <select
                            value={lengthBeforeUnit}
                            onChange={(e) =>
                              setLengthBeforeUnit(e.target.value as "ms" | "s" | "min")
                            }
                            className="caption-duration-select"
                          >
                            <option value="ms">ms</option>
                            <option value="s">s</option>
                            <option value="min">min</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <p className="muted caption-duration-label">After marker</p>
                        <div className="caption-duration-row">
                          <input
                            type="number"
                            min={0}
                            value={lengthAfterValue}
                            onChange={(e) =>
                              setLengthAfterValue(Math.max(0, Number(e.target.value)))
                            }
                            className="caption-duration-input"
                          />

                          <select
                            value={lengthAfterUnit}
                            onChange={(e) =>
                              setLengthAfterUnit(e.target.value as "ms" | "s" | "min")
                            }
                            className="caption-duration-select"
                          >
                            <option value="ms">ms</option>
                            <option value="s">s</option>
                            <option value="min">min</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    className="primary-btn"
                    onClick={() => applyAudioAction("mute")}
                  >
                    Mute audio
                  </button>

                  <button
                    className="ghost-btn"
                    onClick={() => {
                      setPendingAudioAction("increase");
                      setErrorText(null);
                    }}
                  >
                    Increase volume
                  </button>

                  <button
                    className="ghost-btn"
                    onClick={() => {
                      setPendingAudioAction("decrease");
                      setErrorText(null);
                    }}
                  >
                    Decrease volume
                  </button>

                  {pendingAudioAction && (
                    <div style={{ marginTop: "10px" }}>
                      <p className="muted caption-duration-label">
                        {pendingAudioAction === "increase" ? "Increase" : "Decrease"} by how many levels? (1-10)
                      </p>
                      <div className="caption-duration-row">
                        <input
                          type="number"
                          min={1}
                          max={10}
                          step={1}
                          value={audioDeltaLevels}
                          onChange={(e) =>
                            setAudioDeltaLevels(Math.max(1, Math.min(10, Number(e.target.value))))
                          }
                          className="caption-duration-input"
                        />
                        <button
                          className="primary-btn"
                          onClick={() => applyAudioAction(pendingAudioAction, audioDeltaLevels)}
                        >
                          Apply
                        </button>
                        <button
                          className="ghost-btn"
                          onClick={() => setPendingAudioAction(null)}
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="muted caption-duration-label">
                        1 level = 10% of full volume.
                      </p>
                    </div>
                  )}
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
