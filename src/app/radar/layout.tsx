import type { ReactNode } from 'react';
import Link from 'next/link';

const radarNav = [
  { href: '/radar', label: 'Overview' },
  { href: '/radar/live', label: 'Live Feed' },
  { href: '/radar/clusters', label: 'Clusters' },
  { href: '/radar/watchlist', label: 'Watchlist' },
  { href: '/radar/alerts', label: 'Alerts' },
  { href: '/radar/briefs', label: 'Daily Briefs' },
  { href: '/radar/sources', label: 'Sources' },
  { href: '/radar/settings', label: 'Settings' },
];

export default function RadarLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {/* Radar sub-navigation */}
      <div className="border-b border-[#1e1e35] bg-[#0a0a18] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0">
            {radarNav.map((item) => (
              <RadarNavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </div>
    </div>
  );
}

// Needs to be a client component for active state — extracted as a thin wrapper
function RadarNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex-shrink-0 px-3 py-3 text-[13px] font-medium text-[#94a3b8] hover:text-[#f1f5f9] border-b-2 border-transparent hover:border-indigo-500 transition-colors whitespace-nowrap"
    >
      {label}
    </Link>
  );
}
