import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import MemberCard from "../components/MemberCard";
import Reveal from "../components/Reveal";
import { useContent } from "../lib/ContentContext";

const roles = [
  "全部成员",
  "项目负责人",
  "翻译",
  "校对",
  "程序",
  "美术",
  "测试",
];

export default function Team() {
  const { team } = useContent();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("全部成员");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return team.filter(
      (member) =>
        (role === "全部成员" || member.role === role) &&
        `${member.name} ${member.role} ${member.description}`
          .toLowerCase()
          .includes(normalized),
    );
  }, [query, role, team]);

  return (
    <main className="page-shell">
      <Reveal>
        <div className="page-hero">
          <span className="eyebrow">TEAM / 01</span>
          <h1>认识汉化组</h1>
          <p>每一份热爱，都值得被认真翻译。</p>
          <div className="page-hero-number">
            {String(team.length).padStart(2, "0")}
            <br />
            <small>MEMBERS</small>
          </div>
        </div>
      </Reveal>
      <section className="section team-content">
        <Reveal>
          <div className="filter-bar">
            <div className="search-box">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索成员名称、职位或简介"
                aria-label="搜索成员"
              />
            </div>
            <div className="role-filters">
              <SlidersHorizontal size={16} />
              {roles.map((item) => (
                <button
                  type="button"
                  className={role === item ? "active" : ""}
                  key={item}
                  onClick={() => setRole(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </Reveal>
        <div className="member-grid">
          {filtered.map((member, index) => (
            <Reveal key={member.name} delay={index * 60}>
              <MemberCard member={member} index={index} />
            </Reveal>
          ))}
        </div>
        {filtered.length === 0 && (
          <Reveal>
            <div className="empty-state">没有找到符合条件的成员。</div>
          </Reveal>
        )}
      </section>
    </main>
  );
}
