import { useCallback, useRef, useState } from "preact/hooks";
import { speakText } from "../api/commands";

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/---+/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

export function useReadAloud() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  const toggle = useCallback(async (text: string) => {
    if (speaking) {
      stop();
      return;
    }
    const plain = stripMarkdown(text);
    if (!plain) return;

    setSpeaking(true);
    try {
      const base64Audio = await speakText(plain);
      const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
      audioRef.current = audio;
      audio.onended = () => { audioRef.current = null; setSpeaking(false); };
      audio.onerror = () => { audioRef.current = null; setSpeaking(false); };
      await audio.play();
    } catch (e) {
      console.error("TTS failed:", e);
      setSpeaking(false);
    }
  }, [speaking, stop]);

  return { speaking, toggle, stop };
}
