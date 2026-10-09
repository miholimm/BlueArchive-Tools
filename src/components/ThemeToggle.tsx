import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/ThemeContext";

export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "切换为日间学园模式" : "切换为夜间终端模式"}
      title={isDark ? "切换为日间学园模式" : "切换为夜间终端模式"}
    >
      {isDark ? (
        <Moon className="theme-toggle-icon is-active" size={16} />
      ) : (
        <Sun className="theme-toggle-icon is-active" size={16} />
      )}
      <span>{isDark ? "NIGHT OPS" : "DAY OPS"}</span>
    </button>
  );
}
