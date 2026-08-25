"use client";

import { Bell, LogOut, User, ChevronDown } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";
import { getInitials } from "@/lib/utils";
import { UserRole } from "@prisma/client";
import Link from "next/link";
import { useState } from "react";

export function Header() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const name = session?.user?.name ?? "User";
  const role = (session?.user?.role as UserRole) ?? "FACULTY";
  const nameParts = name.split(" ");
  const initials = nameParts.length > 1
    ? getInitials(nameParts[0], nameParts[nameParts.length - 1])
    : name.slice(0, 2).toUpperCase();

  return (
    <header className="h-16 bg-[#161b22] border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left: Page title placeholder */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">LuminAI · Khalifa University</span>
      </div>

      {/* Right: Notifications + User Menu */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white hover:bg-slate-800" asChild>
          <Link href="/dashboard/notifications">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </Link>
        </Button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="text-white text-xs" style={{background:'#1464C8'}}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-slate-200 leading-none">
                {name}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {ROLE_LABELS[role]}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-500 hidden md:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-[#1e293b] border border-slate-700 rounded-lg shadow-2xl py-1 z-50">
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                onClick={() => setMenuOpen(false)}
              >
                <User className="h-4 w-4" />
                My Profile
              </Link>
              <hr className="my-1 border-slate-700" />
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>

        <Badge variant="info" className="hidden md:inline-flex">
          {ROLE_LABELS[role]}
        </Badge>
      </div>
    </header>
  );
}
