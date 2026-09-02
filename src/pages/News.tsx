import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import NewsCard from "../components/NewsCard";
import NewsCardSkeleton from "../components/NewsCardSkeleton";
import Reveal from "../components/Reveal";
import { useContent, useContentLoading } from "../lib/ContentContext";

export default function News() {
  const { news } = useContent();
  const contentLoading = useContentLoading();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return news;
    return news.filter((item) =>
      `${item.title} ${item.author} ${item.content}`
        .toLowerCase()
        .includes(normalized),
    );
  }, [news, query]);

  return (
    <main className="page-shell">
      <Reveal>
        <div className="page-hero news-page-hero">
          <span className="eyebrow">TRANSMISSION / 02</span>
          <h1>更新公告</h1>
          <p>项目的每一段进度，都在这里留下记录。</p>
          <div className="news-signal">● ARCHIVE ONLINE</div>
        </div>
      </Reveal>
      <section className="section news-list-section">
        <Reveal>
          <div className="list-tools">
          <span>
              全部公告 <b>{contentLoading ? "…" : filtered.length}</b>
            </span>
            <div className="search-box">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索公告"
                aria-label="搜索公告"
              />
            </div>
          </div>
        </Reveal>
        <div className="news-list-grid">
          {contentLoading && Array.from({ length: 6 }, (_, index) => (
            <NewsCardSkeleton key={`news-list-skeleton-${index}`} featured={index === 0} />
          ))}
          {!contentLoading && filtered.map((item, index) => (
            <Reveal key={item.id} delay={index * 70}>
              <NewsCard news={item} />
            </Reveal>
          ))}
        </div>
        {!contentLoading && filtered.length === 0 && (
          <Reveal>
            <div className="empty-state">没有找到匹配的公告。</div>
          </Reveal>
        )}
      </section>
    </main>
  );
}
