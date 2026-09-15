import { useState } from "react";
import { Send, Loader2, MessageCircleQuestion, Quote } from "lucide-react";
import { askQuestion } from "../services/api";

export default function QAWidget({ sessionId }) {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim() || !sessionId || loading) return;

    const q = question.trim();
    setQuestion("");
    setLoading(true);

    try {
      const result = await askQuestion(sessionId, q);
      setHistory((prev) => [...prev, { question: q, ...result }]);
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        { question: q, answer: `Error: ${err.message}`, excerpts: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200">
        <MessageCircleQuestion size={16} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700">Ask About This Lecture</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 ? (
          <p className="text-slate-400 italic text-sm">
            {sessionId
              ? "Ask anything about what's been covered so far — e.g. \"what did the professor say about X?\""
              : "Start recording first, then ask questions about the lecture content here."}
          </p>
        ) : (
          history.map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <p className="text-sm font-medium text-slate-800">{item.question}</p>
              <p className="text-sm text-slate-600">{item.answer}</p>
              {item.excerpts?.length > 0 && (
                <div className="flex items-start gap-1.5 text-xs text-slate-400 bg-slate-50 rounded-lg p-2 mt-1">
                  <Quote size={12} className="mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{item.excerpts[0]}</span>
                </div>
              )}
            </div>
          ))
        )}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 size={14} className="animate-spin" /> Thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleAsk} className="border-t border-slate-200 p-3 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={!sessionId}
          placeholder={sessionId ? "Ask a question..." : "Start recording first"}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lecture-500 disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={!sessionId || loading || !question.trim()}
          className="bg-lecture-600 hover:bg-lecture-700 disabled:bg-slate-300 text-white rounded-lg px-3 transition-colors"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
