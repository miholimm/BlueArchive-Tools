import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ThemePreference } from "../types";

type ResolvedTheme = "light" | "dark";

type ThemeState = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (value: ThemePreference) => void;
  toggleTheme: () => void;
};

const storageKey = "ba-theme-preference";
const ThemeContext = createContext<ThemeState | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function normalizeThemePreference(value: ThemePreference | undefined): ThemePreference {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function readSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(preference: ThemePreference, systemTheme: ResolvedTheme): ResolvedTheme {
  return preference === "system" ? systemTheme : preference;
}

export function ThemeProvider({
  defaultTheme,
  children,
}: {
  defaultTheme: ThemePreference;
  children: ReactNode;
}) {
  const [hasManualPreference] = useState(() => isThemePreference(localStorage.getItem(storageKey)));
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    const stored = localStorage.getItem(storageKey);
    return isThemePreference(stored) ? stored : normalizeThemePreference(defaultTheme);
  });
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(readSystemTheme);

  useEffect(() => {
    if (!hasManualPreference) setPreferenceState(normalizeThemePreference(defaultTheme));
  }, [defaultTheme, hasManualPreference]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(query.matches ? "dark" : "light");
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const value = useMemo<ThemeState>(() => {
    const setPreference = (next: ThemePreference) => {
      localStorage.setItem(storageKey, next);
      setPreferenceState(next);
    };
    const resolvedTheme = resolveTheme(preference, systemTheme);
    return {
      preference,
      resolvedTheme,
      setPreference,
      toggleTheme: () => setPreference(resolvedTheme === "dark" ? "light" : "dark"),
    };
  }, [preference, systemTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
