import { useEffect, useRef } from "react";
import { ListChecks, Sparkles } from "lucide-react";

export default function NotesPanel({ notes, isRecording }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [notes]);

  const allBullets = notes.flat();

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        <ListChecks size={16} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">Live Notes</h3>
        <Sparkles size={12} className="text-lecture-500 ml-auto" />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {allBullets.length > 0 ? (
          <ul className="space-y-2">
            {allBullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-lecture-500 mt-1.5 flex-shrink-0" />
                {bullet}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-400 italic text-sm">
            {isRecording
              ? "AI-generated bullet points will appear here as the lecture progresses."
              : "Notes will be generated automatically once recording starts."}
          </p>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
