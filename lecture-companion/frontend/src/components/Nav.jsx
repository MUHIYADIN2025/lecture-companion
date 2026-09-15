import { NavLink } from "react-router-dom";
import { Radio, History } from "lucide-react";

export default function Nav() {
  return (
    <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="bg-lecture-600 text-white p-2 rounded-lg">
          <Radio size={20} />
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">Lecture Companion</p>
          <p className="text-xs text-slate-500">Live transcription, notes &amp; Q&amp;A</p>
        </div>
      </div>

      <nav className="flex gap-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? "bg-lecture-50 text-lecture-700" : "text-slate-600 hover:bg-slate-100"
            }`
          }
        >
          Live Session
        </NavLink>
        <NavLink
          to="/history"
          className={({ isActive }) =>
            `px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
              isActive ? "bg-lecture-50 text-lecture-700" : "text-slate-600 hover:bg-slate-100"
            }`
          }
        >
          <History size={15} />
          History
        </NavLink>
      </nav>
    </header>
  );
}
