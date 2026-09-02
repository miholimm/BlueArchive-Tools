import {
  ArrowLeft,
  CalendarDays,
  MessageSquare,
  Send,
  UserRound,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Reveal from "../components/Reveal";
import { useContent } from "../lib/ContentContext";
import { trackEvent } from "../lib/tracking";
import type { CommentItem } from "../types";
import { authFetch } from "../lib/api";

export default function AnnouncementDetail() {
  const { id } = useParams();
  const { news } = useContent();
  const item = news.find((entry) => entry.id === id);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!id) return;
    authFetch(`/api/comments/${id}`)
      .then((response) => (response.ok ? response.json() : []))
      .then(setComments)
      .catch(() => {});
  }, [id, submitted]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!author.trim() || !content.trim() || !id) return;
    setSubmitting(true);
    try {
      const response = await authFetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcementId: id,
          author: author.trim(),
          content: content.trim(),
        }),
      });
      if (!response.ok) throw new Error("comment failed");
      setSubmitted(true);
      setAuthor("");
      setContent("");
      trackEvent("comment_submit", { announcementId: id });
      setTimeout(() => setSubmitted(false), 500);
    } catch {
      setSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyingTo || !replyContent.trim() || !id) return;
    setSubmitting(true);
    try {
      const response = await authFetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          announcementId: id,
          author: author.trim() || "匿名老师",
          content: replyContent.trim(),
          parentId,
        }),
      });
      if (!response.ok) throw new Error("reply failed");
      setReplyingTo(null);
      setReplyContent("");
      setAuthor("");
      const next = await authFetch(`/api/comments/${id}`);
      if (next.ok) setComments(await next.json());
    } catch {
      setSubmitted(false);
    } finally {
      setSubmitting(false);
    }
  };

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

  const topComments = comments.filter((comment) => !comment.parentId);
  const getReplies = (parentId: string) =>
    comments.filter((comment) => comment.parentId === parentId);

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
      <Reveal delay={260}>
        <div className="comments-section">
          <h2 className="comments-heading">
            <MessageSquare size={20} /> 评论 ({topComments.length})
          </h2>
          <form onSubmit={handleSubmit} className="comment-form">
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              placeholder="你的昵称"
              className="comment-input-name"
            />
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="写下你的评论…"
              rows={3}
              className="comment-input-content"
            />
            {submitted && (
              <div className="comment-submitted-tip">
                评论已提交，审核通过后显示
              </div>
            )}
            <button
              type="submit"
              className="button button-primary button-sm"
              disabled={submitting}
            >
              <Send size={14} /> {submitting ? "提交中…" : "发表评论"}
            </button>
          </form>
          <div className="comment-list">
            {topComments.map((comment) => (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <strong>{comment.author}</strong>
                  <span>
                    {new Date(comment.createdAt).toLocaleString("zh-CN")}
                  </span>
                </div>
                <p className="comment-body">{comment.content}</p>
                <button
                  type="button"
                  className="comment-reply-btn"
                  onClick={() =>
                    setReplyingTo(replyingTo === comment.id ? null : comment.id)
                  }
                >
                  回复
                </button>
                {getReplies(comment.id).map((reply) => (
                  <div key={reply.id} className="comment-reply">
                    <div className="comment-header">
                      <strong>{reply.author}</strong>
                      <span>
                        {new Date(reply.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                    <p className="comment-body">{reply.content}</p>
                  </div>
                ))}
                {replyingTo === comment.id && (
                  <div className="comment-reply-form">
                    <input
                      value={author}
                      onChange={(event) => setAuthor(event.target.value)}
                      placeholder="你的昵称"
                      className="comment-input-name"
                    />
                    <textarea
                      value={replyContent}
                      onChange={(event) => setReplyContent(event.target.value)}
                      placeholder="写下你的回复…"
                      rows={2}
                      className="comment-input-content"
                    />
                    <div className="comment-reply-actions">
                      <button
                        type="button"
                        className="button button-ghost button-sm"
                        onClick={() => setReplyingTo(null)}
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        className="button button-primary button-sm"
                        onClick={() => handleReply(comment.id)}
                        disabled={submitting}
                      >
                        回复
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {topComments.length === 0 && (
              <p
                className="text-muted"
                style={{
                  fontSize: 13,
                  color: "var(--ink-dim)",
                  textAlign: "center",
                  padding: 32,
                }}
              >
                暂无评论，来发表第一条吧！
              </p>
            )}
          </div>
        </div>
      </Reveal>
    </main>
  );
}
