"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  TrendingUp,
  Bot,
  Microscope,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Faculty",
    href: "/dashboard/faculty",
    icon: Users,
    roles: ["DEPARTMENT_CHAIR", "DIVISION_DEAN", "HR_ADMIN", "REVIEW_COMMITTEE", "PROVOST"],
  },
  {
    label: "Performance Reviews",
    href: "/dashboard/appraisal",
    icon: ClipboardList,
  },
  {
    label: "Scholarship",
    href: "/dashboard/research",
    icon: Microscope,
  },
  {
    label: "Promotions",
    href: "/dashboard/promotion",
    icon: TrendingUp,
  },
  {
    label: "AI Assistant",
    href: "/dashboard/ai-assistant",
    icon: Bot,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "";

  const filteredNav = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-700">
        <img src="/Khalifa-University-Logo.png" alt="Khalifa University" className="h-10 w-10 rounded-full flex-shrink-0" />
        <div>
          <p className="text-sm font-bold leading-tight">LuminAI</p>
          <p className="text-xs text-slate-400">Faculty Intelligence</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {filteredNav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[#1464C8] text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          Secure · Compliant · Fair
        </p>
      </div>
    </aside>
  );
}
