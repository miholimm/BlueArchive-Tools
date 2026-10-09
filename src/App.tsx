import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Banner from "./components/Banner";
import Footer from "./components/Footer";
import BackToTop from "./components/BackToTop";
import Loading from "./components/Loading";
import ModuleGate from "./components/ModuleGate";
import RouteViewport from "./components/RouteViewport";
import GameCursor from "./components/GameCursor";
import Home from "./pages/Home";
import Team from "./pages/Team";
import News from "./pages/News";
import NewsDetail from "./pages/NewsDetail";
import Download from "./pages/Download";
import Status from "./pages/Status";
import Changelog from "./pages/Changelog";
import Tutorial from "./pages/Tutorial";
import FAQ from "./pages/FAQ";
import Story from "./pages/Story";
import Archive from "./pages/Archive";
import Feedback from "./pages/Feedback";
import AnnouncementDetail from "./pages/AnnouncementDetail";
import AntiCheat from "./pages/AntiCheat";
import Contributors from "./pages/Contributors";
import { ContentProvider, useContent } from "./lib/ContentContext";
import { ThemeProvider, useTheme } from "./lib/ThemeContext";

const Admin = lazy(() => import("./pages/Admin"));
const StoryReader = lazy(() => import("./pages/StoryReader"));
const Workspace = lazy(() => import("./pages/Workspace"));
const Glossary = lazy(() => import("./pages/Glossary"));
const QA = lazy(() => import("./pages/QA"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const StoryPlayer = lazy(() => import("./pages/StoryPlayer"));

const accentTokens = {
  cyan: { color: "#00a3ff", rgb: "0, 163, 255" },
  blue: { color: "#0284c7", rgb: "2, 132, 199" },
  pink: { color: "#e94f78", rgb: "233, 79, 120" },
  amber: { color: "#d89d00", rgb: "216, 157, 0" },
} as const;

export default function App() {
  return (
    <ContentProvider>
      <AppContent />
    </ContentProvider>
  );
}

function AppContent() {
  const { settings } = useContent();
  return (
    <ThemeProvider defaultTheme={settings.theme}>
      <SiteFrame />
    </ThemeProvider>
  );
}

function SiteFrame() {
  const content = useContent();
  const { resolvedTheme } = useTheme();
  const location = useLocation();
  const backgroundDim = Math.min(
    80,
    Math.max(0, Math.round(Number(content.settings.backgroundDim) || 0)),
  );
  const isAdminRoute =
    location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  const accent = accentTokens[content.settings.accent as keyof typeof accentTokens] || accentTokens.cyan;

  return (
    <div
      className={content.settings.wallpaper ? "app-shell has-wallpaper" : "app-shell"}
      data-theme={resolvedTheme}
      style={
        {
          "--site-wallpaper": content.settings.wallpaper
            ? `url(${content.settings.wallpaper})`
            : "none",
          "--site-background-dim": String(backgroundDim / 100),
          "--site-accent": accent.color,
          "--site-accent-rgb": accent.rgb,
        } as React.CSSProperties
      }
    >
      <GameCursor />
      {!isAdminRoute && <Navbar />}
      {!isAdminRoute && <Banner />}
      <Suspense fallback={<Loading />}>
        <RouteViewport>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/team" element={<ModuleGate module="team"><Team /></ModuleGate>} />
          <Route path="/news" element={<ModuleGate module="news"><News /></ModuleGate>} />
          <Route path="/news/:id" element={<ModuleGate module="news"><NewsDetail /></ModuleGate>} />
          <Route path="/download" element={<ModuleGate module="downloads"><Download /></ModuleGate>} />
          <Route path="/status" element={<ModuleGate module="status"><Status /></ModuleGate>} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/changelog" element={<ModuleGate module="changelog"><Changelog /></ModuleGate>} />
          <Route path="/tutorial" element={<ModuleGate module="tutorial"><Tutorial /></ModuleGate>} />
          <Route path="/faq" element={<ModuleGate module="faq"><FAQ /></ModuleGate>} />
          <Route path="/story" element={<ModuleGate module="story"><Story /></ModuleGate>} />
          <Route path="/story-player" element={<StoryPlayer />} />
          <Route path="/story/:volume/:chapter" element={<ModuleGate module="story"><StoryReader /></ModuleGate>} />
          <Route path="/archive" element={<ModuleGate module="archive"><Archive /></ModuleGate>} />
          <Route path="/feedback" element={<ModuleGate module="feedback"><Feedback /></ModuleGate>} />
          <Route path="/announcements/:id" element={<ModuleGate module="news"><AnnouncementDetail /></ModuleGate>} />
          <Route path="/anti-cheat" element={<ModuleGate module="antiCheat"><AntiCheat /></ModuleGate>} />
          <Route path="/contributors" element={<ModuleGate module="contributors"><Contributors /></ModuleGate>} />
          <Route path="/workspace" element={<ModuleGate module="workspace"><Workspace /></ModuleGate>} />
          <Route path="/glossary" element={<ModuleGate module="glossary"><Glossary /></ModuleGate>} />
          <Route path="/qa" element={<ModuleGate module="qa"><QA /></ModuleGate>} />
          <Route path="/api-docs" element={<ModuleGate module="apiDocs"><ApiDocs /></ModuleGate>} />
          </Routes>
        </RouteViewport>
      </Suspense>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <BackToTop />}
    </div>
  );
}
