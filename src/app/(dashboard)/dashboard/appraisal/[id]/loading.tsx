export default function AppraisalLoading() {
  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-pulse">
      <div className="h-8 w-24 bg-slate-800 rounded-lg" />
      <div className="bg-[#161b22] border border-slate-800 rounded-xl overflow-hidden">
        <div className="h-16 bg-indigo-950/50" />
        <div className="grid grid-cols-4 gap-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-r border-b border-slate-800 px-4 py-3 h-16" />
          ))}
        </div>
        <div className="px-6 py-4">
          <div className="h-4 w-24 bg-slate-800 rounded mb-3" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-slate-800/40 rounded mb-2" />
          ))}
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-[#161b22] border border-slate-800 rounded-xl h-48" />
      ))}
    </div>
  );
}
