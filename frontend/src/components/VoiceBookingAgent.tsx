"use client";

import { useState, useCallback, useEffect } from "react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, ArrowRight, Languages } from "lucide-react";
import { cn } from "@/lib/utils";

type LangCode = "hi-IN" | "kn-IN" | "en-IN";

const LANGUAGES: { code: LangCode; label: string; native: string }[] = [
  { code: "hi-IN", label: "Hindi", native: "हिन्दी" },
  { code: "kn-IN", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "en-IN", label: "English", native: "English" },
];

interface VoiceBookingAgentProps {
  onTranscriptReady: (transcript: string) => void;
  onClose?: () => void;
}

/**
 * VoiceBookingAgent — Step 1 of the voice booking flow.
 * Records farmer's voice, shows live transcript, and sends to Step 2.
 */
export default function VoiceBookingAgent({ onTranscriptReady }: VoiceBookingAgentProps) {
  const [selectedLang, setSelectedLang] = useState<LangCode>("hi-IN");
  const {
    transcript,
    interimTranscript,
    isRecording,
    startRecording,
    stopRecording,
    fallbackNeeded,
    error,
    isSupported,
    setTranscript,
  } = useVoiceRecording(selectedLang);

  // Clean up microphone on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording, stopRecording]);

  const [bhashiniLoading, setBhashiniLoading] = useState(false);

  /**
   * Handle Bhashini fallback when Web Speech API fails.
   * Sends audio to backend for server-side transcription.
   */
  const handleBhashiniFallback = useCallback(async () => {
    setBhashiniLoading(true);
    try {
      // Request microphone access for Bhashini fallback
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(",")[1];
          try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
            const stored = localStorage.getItem("kisaan-mitr-auth");
            const token = stored ? JSON.parse(stored)?.state?.accessToken : null;

            const res = await fetch(`${API_URL}/voice-booking/transcribe`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                audio_base64: base64,
                language: selectedLang.split("-")[0],
              }),
            });

            if (res.ok) {
              const data = await res.json();
              setTranscript(data.transcription || "");
            }
          } catch {
            // Bhashini also failed
          }
          setBhashiniLoading(false);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 5000); // Record 5 seconds
    } catch {
      setBhashiniLoading(false);
    }
  }, [selectedLang, setTranscript]);

  const handleNext = () => {
    const finalText = transcript.trim();
    if (finalText) {
      onTranscriptReady(finalText);
    }
  };

  return (
    <div className="space-y-6">
      {/* Language Selector */}
      <div className="flex justify-center gap-2">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelectedLang(lang.code)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 min-w-[80px]",
              selectedLang === lang.code
                ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
                : "bg-white/10 text-gray-300 border border-white/10 hover:bg-white/15"
            )}
          >
            {lang.native}
          </button>
        ))}
      </div>

      {/* Mic Button */}
      <div className="flex justify-center py-4">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={bhashiniLoading}
          className={cn(
            "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
            "min-w-[80px] min-h-[80px]",
            isRecording
              ? "bg-red-500 shadow-lg shadow-red-500/40 scale-110"
              : "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/40 hover:scale-105",
            bhashiniLoading && "opacity-50 cursor-not-allowed"
          )}
          style={{
            boxShadow: isRecording
              ? "0 0 0 8px rgba(239, 68, 68, 0.2), 0 0 30px rgba(239, 68, 68, 0.3)"
              : "0 0 0 8px rgba(34, 197, 94, 0.2), 0 0 30px rgba(34, 197, 94, 0.3)",
          }}
        >
          {/* Animated rings while recording */}
          {isRecording && (
            <>
              <span className="absolute inset-0 rounded-full border-2 border-red-400 animate-ping opacity-20" />
              <span
                className="absolute -inset-3 rounded-full border border-red-400/30 animate-pulse"
              />
            </>
          )}

          {bhashiniLoading ? (
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          ) : isRecording ? (
            <MicOff className="h-8 w-8 text-white" />
          ) : (
            <Mic className="h-8 w-8 text-white" />
          )}
        </button>
      </div>

      {/* Status Text */}
      <div className="text-center">
        {isRecording ? (
          <p className="text-red-400 text-sm font-medium animate-pulse">Listening... speak now</p>
        ) : bhashiniLoading ? (
          <p className="text-yellow-400 text-sm font-medium">Trying Bhashini...</p>
        ) : (
          <p className="text-gray-400 text-sm">
            {isSupported ? "Tap the mic to start speaking" : "Speech not supported — use Bhashini"}
          </p>
        )}
      </div>

      {/* Transcript Display */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400">Your words</label>
        <div
          className="min-h-[80px] p-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm whitespace-pre-wrap"
          style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
        >
          {transcript && <span>{transcript}</span>}
          {interimTranscript && (
            <span className="text-gray-500 italic"> {interimTranscript}</span>
          )}
          {!transcript && !interimTranscript && (
            <span className="text-gray-500 italic">
              {isRecording ? "Waiting for speech..." : "Transcript will appear here..."}
            </span>
          )}
        </div>

        {/* Editable input for corrections */}
        {transcript && (
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            className="w-full p-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500/20 outline-none"
            style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.1)" }}
            placeholder="Edit transcript if needed..."
          />
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Bhashini Fallback Button */}
      {fallbackNeeded && !bhashiniLoading && (
        <Button
          onClick={handleBhashiniFallback}
          variant="outline"
          className="w-full border-white/20 text-gray-300 hover:bg-white/10"
        >
          <Languages className="mr-2 h-4 w-4" />
          Try Bhashini Transcription
        </Button>
      )}

      {/* Next Button */}
      <Button
        onClick={handleNext}
        disabled={!transcript.trim()}
        className={cn(
          "w-full h-12 text-white font-medium rounded-xl transition-all duration-300 min-h-[48px]",
          transcript.trim()
            ? "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
            : "bg-gray-700 cursor-not-allowed"
        )}
      >
        Next <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
