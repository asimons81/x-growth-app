"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return false;
    return document.body.classList.contains("dark");
  });

  const handleToggle = () => {
    const next = !isDark;
    document.body.classList.toggle("dark", next);
    setIsDark(next);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#2a2a45] bg-[#161625] text-[#94a3b8] hover:text-[#f1f5f9] hover:border-[#3a3a5a] transition-colors"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
