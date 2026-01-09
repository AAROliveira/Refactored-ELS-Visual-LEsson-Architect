
import React from 'react';
import { BookOpen, Sparkles, Database } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center px-6 justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
          <BookOpen size={24} />
        </div>
        <div>
          <h1 className="font-bold text-xl text-gray-900 font-serif tracking-tight">ESL Visual Architect</h1>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">State-of-the-Art Engine</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
          <Database size={14} />
          <span>Data Layer V2</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
          <Sparkles size={14} className="animate-pulse" />
          <span>Gemini 3 Flash</span>
        </div>
      </div>
    </header>
  );
};
