import { useState } from "react";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";

const STATUS_LABEL = {
  idle: "Ready to record",
  connecting: "Connecting...",
  connected: "Recording live",
  error: "Connection error",
};

export default function AudioRecorder({
  isRecording,
  connectionStatus,
  error,
  onStart,
  onStop,
}) {
  const [title, setTitle] = useState("");

  const handleToggle = () => {
    if (isRecording) {
      onStop();
    } else {
      onStart(title.trim() || "Untitled Lecture");
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6">
      {!isRecording && (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Lecture title (optional)"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-lecture-500"
        />
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggle}
            disabled={connectionStatus === "connecting"}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors ${
              isRecording
                ? "bg-red-600 hover:bg-red-700 recording-pulse"
                : "bg-lecture-600 hover:bg-lecture-700"
            } disabled:bg-slate-300`}
          >
            {connectionStatus === "connecting" ? (
              <Loader2 size={22} className="animate-spin" />
            ) : isRecording ? (
              <Square size={20} />
            ) : (
              <Mic size={22} />
            )}
          </button>

          <div>
            <p className="text-sm font-medium text-slate-800">
              {STATUS_LABEL[connectionStatus] || "Ready to record"}
            </p>
            <p className="text-xs text-slate-500">
              {isRecording ? "Click to stop" : "Click the mic to start"}
            </p>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            LIVE
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
