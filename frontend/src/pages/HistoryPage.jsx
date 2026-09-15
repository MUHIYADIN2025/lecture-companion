import { useEffect, useState, useCallback } from "react";
import { Trash2, Loader2, FileText, ListChecks } from "lucide-react";
import { listLectures, getLecture, deleteLecture } from "../services/api";

export default function HistoryPage() {
  const [lectures, setLectures] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listLectures();
      setLectures(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = async (id) => {
    setLoadingDetail(true);
    try {
      const detail = await getLecture(id);
      setSelected(detail);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteLecture(id);
      setLectures((prev) => prev.filter((l) => l.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6">
      <h1 className="text-xl font-semibold text-slate-800 mb-1">Lecture History</h1>
      <p className="text-sm text-slate-500 mb-6">Past recorded sessions, most recent first.</p>

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-2 text-slate-400 py-10 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading...
            </div>
          ) : lectures.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">No lectures recorded yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lectures.map((lecture) => (
                <li
                  key={lecture.id}
                  onClick={() => handleSelect(lecture.id)}
                  className={`px-4 py-3 cursor-pointer hover:bg-slate-50 flex items-start justify-between gap-2 ${
                    selected?.id === lecture.id ? "bg-lecture-50" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{lecture.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(lecture.started_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDelete(lecture.id, e)}
                    className="text-slate-300 hover:text-red-600 flex-shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="md:col-span-2 space-y-4">
          {loadingDetail ? (
            <div className="flex items-center justify-center gap-2 text-slate-400 py-16 text-sm">
              <Loader2 size={16} className="animate-spin" /> Loading lecture...
            </div>
          ) : selected ? (
            <>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={15} className="text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">Transcript</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed max-h-64 overflow-y-auto">
                  {selected.transcript || "No transcript recorded."}
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ListChecks size={15} className="text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">Notes</h3>
                </div>
                {selected.notes?.flat().length > 0 ? (
                  <ul className="space-y-1.5">
                    {selected.notes.flat().map((bullet, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-lecture-500 mt-1.5 flex-shrink-0" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 italic">No notes generated.</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center text-slate-400 text-sm py-16">
              Select a lecture to view its transcript and notes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
