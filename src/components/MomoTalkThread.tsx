import { CheckCircle2, MessageCircle, Sparkles } from "lucide-react";
import type { QAAnswer, QAQuestion } from "../types";

export default function MomoTalkThread({
  question,
  onVote,
  onAccept,
  canModerate,
}: {
  question: QAQuestion;
  onVote: (answerId?: string) => void;
  onAccept: (answerId: string) => void;
  canModerate: boolean;
}) {
  const answers = question.answers || [];

  return (
    <section className="momo-talk-thread" aria-label="MomoTalk 问答对话">
      <div className="momo-talk-stream">
        <article className="momo-bubble teacher">
          <div className="momo-bubble-meta"><Sparkles size={12} /> {question.author} / TEACHER</div>
          <div className="momo-bubble-copy">
            <strong>{question.title}</strong>
            <p>{question.content}</p>
            <button type="button" className="momo-vote" onClick={() => onVote()}>
              <MessageCircle size={13} /> 认可 {question.votes}
            </button>
          </div>
        </article>
        {answers.map((answer) => (
          <AnswerBubble
            key={answer.id}
            answer={answer}
            onVote={() => onVote(answer.id)}
            onAccept={() => onAccept(answer.id)}
            canModerate={canModerate}
            questionClosed={question.status === "closed"}
          />
        ))}
        {answers.length === 0 && (
          <article className="momo-bubble support">
            <div className="momo-bubble-meta">SCHALE SUPPORT</div>
            <div className="momo-bubble-copy">暂无回答，等待一位熟悉该问题的老师接入频道。</div>
          </article>
        )}
      </div>
    </section>
  );
}

function AnswerBubble({
  answer,
  onVote,
  onAccept,
  canModerate,
  questionClosed,
}: {
  answer: QAAnswer;
  onVote: () => void;
  onAccept: () => void;
  canModerate: boolean;
  questionClosed: boolean;
}) {
  return (
    <article className="momo-bubble support">
      <div className="momo-bubble-meta">{answer.author} / SUPPORT NODE</div>
      <div className="momo-bubble-copy">
        <p>{answer.content}</p>
        <div className="momo-bubble-actions">
          <button type="button" className="momo-vote" onClick={onVote}><MessageCircle size={13} /> 认可 {answer.votes}</button>
          {answer.accepted && <span className="momo-accepted"><CheckCircle2 size={14} /> 已采纳</span>}
          {canModerate && !answer.accepted && !questionClosed && (
            <button type="button" className="momo-accept" onClick={onAccept}>采纳方案</button>
          )}
        </div>
      </div>
    </article>
  );
}
