export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-56 bg-slate-800 rounded-lg" />
          <div className="h-4 w-72 bg-slate-800/60 rounded mt-2" />
        </div>
        <div className="h-9 w-44 bg-slate-800 rounded-lg" />
      </div>

      {/* KPI row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-[#161b22] border border-slate-800 border-l-4 border-l-slate-700 rounded-lg p-4 h-28" />
        ))}
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-[#161b22] border border-slate-800 border-l-4 border-l-slate-700 rounded-lg p-4 h-28" />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#161b22] border border-slate-800 rounded-xl h-64" />
        <div className="bg-[#161b22] border border-slate-800 rounded-xl h-64" />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[#161b22] border border-slate-800 rounded-xl h-80" />
        <div className="bg-[#161b22] border border-slate-800 rounded-xl h-80" />
      </div>
    </div>
  );
}
