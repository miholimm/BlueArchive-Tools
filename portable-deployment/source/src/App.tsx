import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Banner from "./components/Banner";
import Footer from "./components/Footer";
import BackToTop from "./components/BackToTop";
import Loading from "./components/Loading";
import ModuleGate from "./components/ModuleGate";
import RouteViewport from "./components/RouteViewport";
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

const Admin = lazy(() => import("./pages/Admin"));
const StoryReader = lazy(() => import("./pages/StoryReader"));
const Workspace = lazy(() => import("./pages/Workspace"));
const Glossary = lazy(() => import("./pages/Glossary"));
const QA = lazy(() => import("./pages/QA"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));

export default function App() {
  return (
    <ContentProvider>
      <AppContent />
    </ContentProvider>
  );
}

function AppContent() {
  const content = useContent();
  const location = useLocation();
  const backgroundDim = Math.min(
    80,
    Math.max(0, Math.round(Number(content.settings.backgroundDim) || 0)),
  );
  const isAdminRoute =
    location.pathname === "/admin" || location.pathname.startsWith("/admin/");

  return (
    <div
      className={content.settings.wallpaper ? "app-shell has-wallpaper" : "app-shell"}
      style={
        {
          "--site-wallpaper": content.settings.wallpaper
            ? `url(${content.settings.wallpaper})`
            : "none",
          "--site-background-dim": String(backgroundDim / 100),
        } as React.CSSProperties
      }
    >
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
