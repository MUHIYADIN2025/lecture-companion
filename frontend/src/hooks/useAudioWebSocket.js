import { useCallback, useRef, useState } from "react";

const CHUNK_INTERVAL_MS = 4000; // send ~4s of audio per chunk to the backend
const TARGET_SAMPLE_RATE = 16000; // what faster-whisper expects

/**
 * Downsamples a Float32 audio buffer from the mic's native sample rate
 * (usually 44100/48000Hz) to 16kHz, then converts to 16-bit PCM — the
 * format the backend's faster-whisper pipeline expects. Doing this in the
 * browser (rather than sending raw 48kHz audio) keeps the WebSocket
 * payload smaller and avoids adding a resampling dependency server-side.
 */
function downsampleTo16kPCM(float32Array, inputSampleRate) {
  const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
  const outputLength = Math.floor(float32Array.length / ratio);
  const pcm16 = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = Math.floor(i * ratio);
    const sample = Math.max(-1, Math.min(1, float32Array[srcIndex]));
    pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return pcm16.buffer;
}

/**
 * Manages the full audio pipeline: mic permission -> AudioContext capture
 * -> periodic PCM16 chunk extraction -> WebSocket send, plus the incoming
 * transcript/notes event stream from the server.
 */
export default function useAudioWebSocket() {
  const [isRecording, setIsRecording] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("idle"); // idle | connecting | connected | error
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const pcmBufferRef = useRef([]);
  const chunkTimerRef = useRef(null);

  const flushBuffer = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    if (pcmBufferRef.current.length === 0) return;

    // Concatenate buffered Int16 chunks into one ArrayBuffer and send.
    const totalLength = pcmBufferRef.current.reduce((sum, buf) => sum + buf.byteLength, 0);
    const merged = new Uint8Array(totalLength);
    let offset = 0;
    for (const buf of pcmBufferRef.current) {
      merged.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }
    pcmBufferRef.current = [];
    ws.send(merged.buffer);
  }, []);

  const startRecording = useCallback(
    async (title = "Untitled Lecture") => {
      setError(null);
      setTranscript("");
      setNotes([]);
      setConnectionStatus("connecting");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        // ScriptProcessorNode is deprecated but has the widest browser
        // support for this use case; AudioWorklet is the modern
        // replacement if you want to upgrade this later.
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsBase = import.meta.env.VITE_WS_BASE_URL || `${wsProtocol}//${window.location.host}`;
        const ws = new WebSocket(`${wsBase}/ws/lecture?title=${encodeURIComponent(title)}`);
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        ws.onopen = () => {
          setConnectionStatus("connected");
          setIsRecording(true);
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === "session_started") {
            setSessionId(data.session_id);
          } else if (data.type === "transcript_update") {
            setTranscript(data.full_transcript);
          } else if (data.type === "notes_update") {
            setNotes((prev) => [...prev, data.bullets]);
          } else if (data.type === "error") {
            setError(data.message);
          }
        };

        ws.onerror = () => {
          setConnectionStatus("error");
          setError("WebSocket connection failed. Is the backend running?");
        };

        ws.onclose = () => {
          setConnectionStatus("idle");
        };

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcm16Buffer = downsampleTo16kPCM(inputData, audioContext.sampleRate);
          pcmBufferRef.current.push(pcm16Buffer);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);

        chunkTimerRef.current = setInterval(flushBuffer, CHUNK_INTERVAL_MS);
      } catch (err) {
        setConnectionStatus("error");
        setError(err.message || "Microphone access was denied or unavailable.");
      }
    },
    [flushBuffer]
  );

  const stopRecording = useCallback(() => {
    flushBuffer(); // send any remaining buffered audio before closing

    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "end_session" }));
      wsRef.current.close();
    }

    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    streamRef.current?.getTracks().forEach((track) => track.stop());

    setIsRecording(false);
  }, [flushBuffer]);

  return {
    isRecording,
    connectionStatus,
    transcript,
    notes,
    error,
    sessionId,
    startRecording,
    stopRecording,
  };
}
