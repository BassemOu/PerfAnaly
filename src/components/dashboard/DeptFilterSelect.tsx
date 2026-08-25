"use client";

import { useRouter, usePathname } from "next/navigation";
import { Building2 } from "lucide-react";

export function DeptFilterSelect({
  departments,
  selectedId,
}: {
  departments: { id: string; name: string }[];
  selectedId: string;
}) {
  const router   = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
      <select
        value={selectedId}
        onChange={(e) => {
          const val = e.target.value;
          router.push(val ? `${pathname}?dept=${val}` : pathname);
        }}
        className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
      >
        <option value="">All Departments</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
    </div>
  );
}
