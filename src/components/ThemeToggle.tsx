"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // While not mounted, render neutral buttons to avoid hydration mismatch
  const renderButton = (key: string, title: string, onClick: () => void, icon: React.ReactNode, active?: boolean) => (
    <button title={title} onClick={onClick} className={`rounded-full p-2 transition-colors ${mounted && active ? "bg-slate-200 dark:bg-slate-700" : "hover:bg-slate-100 dark:hover:bg-slate-700/50"}`}>
      {icon}
    </button>
  );

  return (
    <div className="inline-flex items-center">
      <div className="flex items-center gap-1 rounded-full bg-slate-100/80 px-1 py-1 shadow-inner backdrop-blur-sm dark:bg-slate-800/80">
        {renderButton("light", "Light", () => setTheme("light"), <Sun className="h-4 w-4 text-amber-500" />, theme === "light")}
        {renderButton("system", "System", () => setTheme("system"), <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">A</span>, theme === "system")}
        {renderButton("dark", "Dark", () => setTheme("dark"), <Moon className="h-4 w-4 text-sky-400" />, theme === "dark")}
      </div>
    </div>
  );
}
