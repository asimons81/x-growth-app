"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthUser } from '@/hooks/useAuthUser';

const navItems = [
  { href: '/', label: '🏠 Home', icon: '🏠' },
  { href: '/dashboard', label: '📊 Dashboard', icon: '📊' },
  { href: '/compose', label: '✍️ Compose', icon: '✍️' },
  { href: '/schedule', label: '📅 Schedule', icon: '📅' },
  { href: '/ideas', label: '💡 Ideas', icon: '💡' },
  { href: '/library', label: '📚 Library', icon: '📚' },
  { href: '/settings', label: '⚙️ Settings', icon: '⚙️' },
];

export default function Navigation() {
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuthUser();
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 z-50">
      <div className="max-w-4xl mx-auto px-3 pt-2">
        <div className="flex justify-end">
          <span
            className={`text-[10px] px-2 py-1 rounded-full border ${
              loading
                ? 'text-gray-400 border-gray-700'
                : isAuthenticated
                  ? 'text-green-400 border-green-900 bg-green-900/20'
                  : 'text-yellow-400 border-yellow-900 bg-yellow-900/20'
            }`}
          >
            {loading ? 'Auth: Checking' : isAuthenticated ? 'Auth: Signed In' : 'Auth: Guest'}
          </span>
        </div>
      </div>
      <div className="flex justify-around items-center max-w-4xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-3 px-2 text-xs transition ${
                isActive 
                  ? 'text-blue-400' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <span className="text-lg mb-1">{item.icon}</span>
              <span>{item.label.split(' ')[1]}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
