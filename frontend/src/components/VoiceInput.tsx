'use client'

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Mic, AlertCircle } from "lucide-react";

type VoiceStatus = 'idle' | 'listening' | 'done' | 'error' | 'unsupported'

interface VoiceInputProps {
  onResult: (transcript: string) => void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

export function VoiceInput({ onResult }: VoiceInputProps) {
  const [status, setStatus] = useState<VoiceStatus>('idle')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const toFriendlyError = (code?: string, message?: string) => {
    if (message) return message
    switch (code) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Microphone permission blocked. Allow mic access for this site and try again.'
      case 'no-speech':
        return 'No speech detected. Try speaking closer to the microphone.'
      case 'audio-capture':
        return 'No microphone found or it is in use by another app.'
      case 'network':
        return 'Speech service network error. Check your connection and try again.'
      case 'aborted':
        return 'Speech recognition aborted.'
      default:
        return code ? `Speech recognition error: ${code}` : 'Speech recognition error'
    }
  }

  const startListening = () => {
    if (recognitionRef.current || status === 'listening') {
      return
    }

    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setStatus('unsupported')
      return
    }

    setError('')
    setInterim('')

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.lang = 'kn-IN'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => setStatus('listening')

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          setStatus('done')
          onResult(transcript)
        } else {
          setInterim(transcript)
        }
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setStatus('error')
      setError(toFriendlyError(event.error, event.message))
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setStatus((prev) => (prev === 'listening' ? 'idle' : prev))
    }

    try {
      recognition.start()
    } catch (e: any) {
      recognitionRef.current = null
      setStatus('error')
      setError(e?.message || 'Unable to start speech recognition')
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={startListening}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium",
          status === 'listening' && "border-amber-500/40 text-amber-400",
          status === 'done' && "border-green-500/40 text-green-400",
          status === 'error' && "border-red-500/40 text-red-400",
          status === 'unsupported' && "border-amber-500/40 text-amber-400"
        )}
      >
        <Mic className="h-4 w-4" />
        {status === 'listening' ? "Listening…" : "Voice Input"}
      </button>

      {interim && status === 'listening' && (
        <div className="text-sm text-slate-400">
          <span className="font-medium">Live:</span> {interim}
        </div>
      )}

      {status === 'unsupported' && (
        <div className="flex items-start gap-2 text-sm text-amber-400">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <span>Voice input not supported in this browser.</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}