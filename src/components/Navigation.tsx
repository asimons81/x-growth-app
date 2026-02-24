"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthUser } from "@/hooks/useAuthUser";
import {
  LayoutDashboard,
  PenLine,
  Lightbulb,
  Calendar,
  CalendarDays,
  BookOpen,
  Settings,
  Zap,
  BarChart2,
  Shuffle,
  TrendingUp,
  ChevronRight,
  Circle,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "main" },
  { href: "/compose", label: "Compose", icon: PenLine, group: "main" },
  { href: "/ideas", label: "Ideas", icon: Lightbulb, group: "main" },
  { href: "/schedule", label: "Schedule", icon: Calendar, group: "main" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, group: "main" },
  { href: "/library", label: "Library", icon: BookOpen, group: "tools" },
  { href: "/analytics", label: "Analytics", icon: BarChart2, group: "tools" },
  { href: "/hooks", label: "Hook Generator", icon: Zap, group: "tools" },
  { href: "/repurpose", label: "Repurpose", icon: Shuffle, group: "tools" },
];

// Bottom nav shows only the most important 5 for mobile
const bottomNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/compose", label: "Compose", icon: PenLine },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SidebarItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
        active
          ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-indigo-300 border border-indigo-500/20"
          : "text-[#94a3b8] hover:text-[#f1f5f9] hover:bg-[#1c1c2e]"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-400 rounded-full" />
      )}
      <Icon size={16} className={active ? "text-indigo-400" : "text-current opacity-70 group-hover:opacity-100"} />
      <span>{label}</span>
      {active && <ChevronRight size={12} className="ml-auto text-indigo-500" />}
    </Link>
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuthUser();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] flex-col z-50 border-r border-[#1e1e35] bg-[#070711]">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-[#1e1e35]">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-[#f1f5f9] text-sm">GrowthOS</span>
              <span className="block text-[10px] text-[#4b5563] leading-none">for X</span>
            </div>
          </Link>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="mb-1">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-[#4b5563] mb-2">Main</p>
            {navItems
              .filter((i) => i.group === "main")
              .map((item) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.href)}
                />
              ))}
          </div>

          <div className="pt-2">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-[#4b5563] mb-2">Tools</p>
            {navItems
              .filter((i) => i.group === "tools")
              .map((item) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isActive(item.href)}
                />
              ))}
          </div>
        </nav>

        {/* Bottom: auth status + settings */}
        <div className="px-3 py-4 border-t border-[#1e1e35] space-y-1">
          <SidebarItem
            href="/settings"
            label="Settings"
            icon={Settings}
            active={isActive("/settings")}
          />
          <div className="flex items-center gap-2 px-3 py-2">
            <Circle
              size={8}
              className={`fill-current ${
                loading
                  ? "text-[#4b5563]"
                  : isAuthenticated
                  ? "text-emerald-400"
                  : "text-amber-400"
              }`}
            />
            <span className="text-[11px] text-[#4b5563]">
              {loading ? "Connecting..." : isAuthenticated ? "Signed in" : "Guest mode"}
            </span>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[#1e1e35] bg-[#070711]/95 backdrop-blur-xl">
        <div className="flex justify-around items-center px-2 py-2 safe-area-pb">
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                  active ? "text-indigo-400" : "text-[#4b5563] hover:text-[#94a3b8]"
                }`}
              >
                <div className={`relative p-1.5 rounded-lg ${active ? "bg-indigo-500/15" : ""}`}>
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                  {active && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
