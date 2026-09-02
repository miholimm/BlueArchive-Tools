import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getContent, type SiteContent } from "./api";
import type { DownloadData, Member, NewsItem, StatusData } from "../types";
import { defaultModuleVisibility } from "../data/siteModules";
import { normalizeStatusData } from "./status";

const fallback: SiteContent = {
  news: [] as NewsItem[],
  download: { android: [], windows: [], ios: [], macos: [] } as DownloadData,
  team: [] as Member[],
  status: normalizeStatusData(undefined) as StatusData,
  settings: {
    siteTitle: "蔚蓝档案汉化组",
    siteSubtitle: "为玩家提供高质量本地化体验",
    wallpaper: "",
    backgroundDim: 0,
    accent: "cyan",
    theme: "system",
    moduleVisibility: defaultModuleVisibility,
  },
};

const ContentContext = createContext<SiteContent>(fallback);
const ContentRefreshContext = createContext<() => Promise<void>>(
  async () => {},
);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState(fallback);

  const refresh = async () => {
    const value = await getContent();
    setContent(value);
  };

  useEffect(() => {
    let active = true;
    const sync = () => {
      getContent()
        .then((value) => {
          if (active) setContent(value);
        })
        .catch(() => {});
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "ba_admin_token" || event.key === "ba_admin_identity") sync();
    };
    sync();
    window.addEventListener("ba_admin_auth_changed", sync);
    window.addEventListener("storage", handleStorage);
    return () => {
      active = false;
      window.removeEventListener("ba_admin_auth_changed", sync);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <ContentContext.Provider value={content}>
      <ContentRefreshContext.Provider value={refresh}>
        {children}
      </ContentRefreshContext.Provider>
    </ContentContext.Provider>
  );
}

export function useContent() {
  return useContext(ContentContext);
}

export function useRefreshContent() {
  return useContext(ContentRefreshContext);
}
