import { useEffect, useRef } from "react";
import { FileText } from "lucide-react";

export default function LiveTranscript({ transcript, isRecording }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        <FileText size={16} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">Live Transcript</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed text-slate-700">
        {transcript ? (
          <p>
            {transcript}
            {isRecording && (
              <span className="inline-block w-1.5 h-4 bg-lecture-500 ml-1 animate-pulse align-middle" />
            )}
          </p>
        ) : (
          <p className="text-slate-400 italic">
            {isRecording
              ? "Listening... transcript will appear as you speak."
              : "Start recording to see the live transcript here."}
          </p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
