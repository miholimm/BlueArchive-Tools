import { ArrowUpRight, Github, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useContent } from '../lib/ContentContext'
import { canAccessModule, useAdminAccess } from '../lib/moduleAccess'
import BrandMark from './BrandMark'
import GoogleAd from './GoogleAd'

export default function Footer() {
  const { settings } = useContent()
  const admin = useAdminAccess()
  const visible = (module: Parameters<typeof canAccessModule>[1]) => canAccessModule(settings, module, admin)
  return (
    <footer className="site-footer">
      <GoogleAd slotKey="footerBanner" style={{ margin: '0 auto 24px', maxWidth: '1200px' }} />
      <div className="footer-grid">
        <div>
          <div className="brand footer-brand">
            <BrandMark />
            <span><strong>蔚蓝档案</strong><small>本地化计划 / 2026</small></span>
          </div>
          <p className="footer-intro">为每一位老师，保留故事原本的温度。<br />这是一个由玩家驱动的非营利本地化项目。</p>
        </div>
        <div>
          <span className="footer-label">导航</span>
          {visible('news') && <Link to="/news">更新公告</Link>}
          {visible('changelog') && <Link to="/changelog">更新日志</Link>}
          {visible('story') && <Link to="/story">剧情库</Link>}
          {visible('tutorial') && <Link to="/tutorial">安装教程</Link>}
          {visible('downloads') && <Link to="/download">资源下载</Link>}
          {visible('faq') && <Link to="/faq">常见问题</Link>}
          {visible('status') && <Link to="/status">维护状态</Link>}
        </div>
        <div>
          <span className="footer-label">社区</span>
          {visible('feedback') && <Link to="/feedback">翻译反馈</Link>}
          {visible('contributors') && <Link to="/contributors">贡献榜</Link>}
          {visible('antiCheat') && <Link to="/anti-cheat">反作弊追踪</Link>}
          {visible('workspace') && <Link to="/workspace">协作工作台</Link>}
          {visible('glossary') && <Link to="/glossary">术语库</Link>}
          {visible('qa') && <Link to="/qa">问答</Link>}
          {visible('apiDocs') && <Link to="/api-docs">API 文档</Link>}
        </div>
        <div>
          <span className="footer-label">加入我们</span>
          <a href="https://github.com/BlueArchive-Translation/BlueArchive-Localization-Web" target="_blank" rel="noreferrer"><Github size={15} /> GitHub</a>
          <a href="https://discord.com" target="_blank" rel="noreferrer"><MessageCircle size={15} /> 社区频道</a>
        </div>
        <div className="footer-note">
          <span>PROJECT BLUE ARCHIVE</span>
          <strong>让故事，被更多人听见。</strong>
          <ArrowUpRight size={30} />
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Blue Archive Localization Project</span>
        <span>非官方玩家汉化项目 · 与 NEXON 无关</span>
        <Link to="/admin" className="footer-admin-link">管理后台</Link>
      </div>
    </footer>
  )
}

