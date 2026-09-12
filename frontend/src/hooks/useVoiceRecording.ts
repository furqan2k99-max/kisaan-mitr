"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type Language = "hi-IN" | "kn-IN" | "en-IN";

interface UseVoiceRecordingReturn {
  transcript: string;
  interimTranscript: string;
  isRecording: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  fallbackNeeded: boolean;
  error: string | null;
  isSupported: boolean;
  setTranscript: (text: string) => void;
}

/**
 * Custom hook for voice recording using Web Speech API.
 * Supports Hindi, Kannada, and English.
 * Falls back gracefully if the browser doesn't support speech recognition.
 */
export function useVoiceRecording(language: Language = "hi-IN"): UseVoiceRecordingReturn {
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [fallbackNeeded, setFallbackNeeded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if Web Speech API is supported
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setFallbackNeeded(true);
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    setError(null);
    setInterimTranscript("");

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setFallbackNeeded(true);
      setError("Speech recognition not supported in this browser");
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscript((prev) => (prev ? prev + " " + final : final).trim());
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);

      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access denied. Please allow microphone in browser settings.");
        setIsRecording(false);
        return;
      }

      if (event.error === "network") {
        setError("Network error. Trying Bhashini fallback...");
        setFallbackNeeded(true);
        setIsRecording(false);
        return;
      }

      if (event.error === "no-speech") {
        // No speech detected — keep recording
        return;
      }

      // For other errors, set fallback needed
      setFallbackNeeded(true);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (e) {
      setError("Could not start speech recognition. Trying Bhashini fallback...");
      setFallbackNeeded(true);
    }
  }, [language]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    setInterimTranscript("");
  }, []);

  return {
    transcript,
    interimTranscript,
    isRecording,
    startRecording,
    stopRecording,
    fallbackNeeded,
    error,
    isSupported,
    setTranscript,
  };
}
