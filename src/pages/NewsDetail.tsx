import { ArrowLeft, CalendarDays, UserRound } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Link, useParams } from "react-router-dom";
import Reveal from "../components/Reveal";
import { useContent } from "../lib/ContentContext";

export default function NewsDetail() {
  const { id } = useParams();
  const { news } = useContent();
  const item = news.find((entry) => entry.id === id);

  if (!item)
    return (
      <main className="page-shell">
        <Reveal>
          <div className="empty-state">
            公告不存在。<Link to="/news">返回公告列表</Link>
          </div>
        </Reveal>
      </main>
    );

  return (
    <main className="article-shell">
      <Reveal>
        <Link to="/news" className="back-link">
          <ArrowLeft size={16} /> 返回全部公告
        </Link>
      </Reveal>
      <Reveal>
        <div className="article-heading">
          <span className="eyebrow">TRANSMISSION / 0{item.id}</span>
          <h1>{item.title}</h1>
          <div className="article-meta">
            <span>
              <CalendarDays size={15} /> {item.date}
            </span>
            <span>
              <UserRound size={15} /> {item.author}
            </span>
          </div>
        </div>
      </Reveal>
      {item.cover && (
        <Reveal delay={120}>
          <img
            className="article-cover"
            src={item.cover}
            alt={`${item.title} 封面`}
          />
        </Reveal>
      )}
      <Reveal delay={200}>
        <article className="markdown-body">
          <ReactMarkdown>{item.content}</ReactMarkdown>
        </article>
      </Reveal>
    </main>
  );
}
