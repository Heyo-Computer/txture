import { signal } from "@preact/signals";
import { useEffect, useRef, useCallback } from "preact/hooks";
import { transcribeAudio } from "../api/commands";

export type VoiceState = "idle" | "recording" | "transcribing";
export const voiceState = signal<VoiceState>("idle");
export const voiceError = signal<string>("");

const MAX_RECORDING_MS = 60_000;

function getSupportedMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const type of ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  // Let the browser pick a default
  return "";
}

export function useVoiceInput(onTranscription: (text: string) => void) {
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timeoutId = useRef<number | null>(null);
  const onTranscriptionRef = useRef(onTranscription);
  onTranscriptionRef.current = onTranscription;

  const stopRecording = useCallback(() => {
    if (timeoutId.current) {
      clearTimeout(timeoutId.current);
      timeoutId.current = null;
    }
    if (mediaRecorder.current?.state === "recording") {
      mediaRecorder.current.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    voiceError.value = "";

    const mimeType = getSupportedMimeType();
    if (mimeType === null) {
      voiceError.value = "MediaRecorder not supported in this browser.";
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (chunks.current.length === 0) {
          voiceError.value = "No audio data captured.";
          voiceState.value = "idle";
          return;
        }
        const actualMime = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunks.current, { type: actualMime });
        voiceState.value = "transcribing";

        try {
          const base64 = await blobToBase64(blob);
          const text = await transcribeAudio(base64, actualMime.split(";")[0]);
          onTranscriptionRef.current(text.trim());
        } catch (e) {
          voiceError.value = `${e}`;
        } finally {
          voiceState.value = "idle";
        }
      };

      recorder.onerror = () => {
        voiceError.value = "Recording failed.";
        voiceState.value = "idle";
        stream.getTracks().forEach((t) => t.stop());
      };

      // Use timeslice to ensure ondataavailable fires during recording
      recorder.start(1000);
      mediaRecorder.current = recorder;
      voiceState.value = "recording";

      timeoutId.current = window.setTimeout(stopRecording, MAX_RECORDING_MS);
    } catch (e) {
      voiceError.value = `Microphone access failed: ${e}`;
      voiceState.value = "idle";
    }
  }, [stopRecording]);

  const toggle = useCallback(() => {
    if (voiceState.value === "recording") {
      stopRecording();
    } else if (voiceState.value === "idle") {
      startRecording();
    }
  }, [startRecording, stopRecording]);

  // Global Ctrl+H shortcut
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggle]);

  return { toggle };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
