# 蔚蓝档案汉化官网前端关键结构

这份文档用于前端交接和视觉改版。完整业务逻辑以项目源文件为准。

## 关键文件

- src/main.tsx：React 挂载入口和 BrowserRouter。
- src/App.tsx：全局布局、路由、懒加载和模块访问控制。
- src/pages/Home.tsx：首页区块组合。
- src/components/Hero.tsx：首页主视觉和动态信息卡。
- src/components/Navbar.tsx：响应式导航。
- src/components/Footer.tsx：页脚导航。
- src/styles.css：全局设计变量、布局、动画和组件样式。
- tailwind.config.js：Tailwind 扫描范围和字体配置。

## React 挂载入口

~~~tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
~~~

## App 路由结构

~~~tsx
import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Banner from './components/Banner'
import Footer from './components/Footer'
import BackToTop from './components/BackToTop'
import Loading from './components/Loading'
import ModuleGate from './components/ModuleGate'
import RouteViewport from './components/RouteViewport'
import Home from './pages/Home'
import Team from './pages/Team'
import News from './pages/News'
import NewsDetail from './pages/NewsDetail'
import Download from './pages/Download'
import Status from './pages/Status'
import { ContentProvider } from './lib/ContentContext'

const Admin = lazy(() => import('./pages/Admin'))
const StoryReader = lazy(() => import('./pages/StoryReader'))
const Workspace = lazy(() => import('./pages/Workspace'))
const Glossary = lazy(() => import('./pages/Glossary'))
const QA = lazy(() => import('./pages/QA'))
const ApiDocs = lazy(() => import('./pages/ApiDocs'))

export default function App() {
  return <ContentProvider><AppContent /></ContentProvider>
}

function AppContent() {
  const location = useLocation()
  const isAdminRoute = location.pathname === '/admin' || location.pathname.startsWith('/admin/')

  return (
    <div className='app-shell'>
      {!isAdminRoute && <Navbar />}
      {!isAdminRoute && <Banner />}
      <Suspense fallback={<Loading />}>
        <RouteViewport>
          <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/team' element={<ModuleGate module='team'><Team /></ModuleGate>} />
            <Route path='/news' element={<ModuleGate module='news'><News /></ModuleGate>} />
            <Route path='/news/:id' element={<ModuleGate module='news'><NewsDetail /></ModuleGate>} />
            <Route path='/download' element={<ModuleGate module='downloads'><Download /></ModuleGate>} />
            <Route path='/status' element={<ModuleGate module='status'><Status /></ModuleGate>} />
            <Route path='/admin' element={<Admin />} />
            <Route path='/story' element={<ModuleGate module='story'><Story /></ModuleGate>} />
            <Route path='/story/:volume/:chapter' element={<ModuleGate module='story'><StoryReader /></ModuleGate>} />
            <Route path='/workspace' element={<ModuleGate module='workspace'><Workspace /></ModuleGate>} />
            <Route path='/glossary' element={<ModuleGate module='glossary'><Glossary /></ModuleGate>} />
            <Route path='/qa' element={<ModuleGate module='qa'><QA /></ModuleGate>} />
            <Route path='/api-docs' element={<ModuleGate module='apiDocs'><ApiDocs /></ModuleGate>} />
          </Routes>
        </RouteViewport>
      </Suspense>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <BackToTop />}
    </div>
  )
}
~~~

## Home 页面结构

~~~tsx
export default function Home() {
  const { news, download, team, status, settings } = useContent()
  const admin = useAdminAccess()
  const showTeam = canAccessModule(settings, 'team', admin)
  const showNews = canAccessModule(settings, 'news', admin)
  const showDownloads = canAccessModule(settings, 'downloads', admin)
  const showStatus = canAccessModule(settings, 'status', admin)
  const showTutorial = canAccessModule(settings, 'tutorial', admin)

  return (
    <>
      <Hero showNews={showNews} showStatus={showStatus} showDownloads={showDownloads} />
      <main>
        {showStatus && <section className='section status-strip'>
          <div className='section-heading compact'>
            <span className='eyebrow'>01 / STATUS</span>
            <h2>项目状态</h2>
            <p>展示文本汉化资源与官方版本的自动比对结果。</p>
          </div>
          <div className='status-overview'>
            <div className='status-main'><strong>{translateStatusLabel}</strong><b>AUTO CHECK</b></div>
            <div className='stat-block'><span>资源版本</span><strong>{resourceVersion}</strong><small>{resourceDate}</small></div>
            <div className='stat-block'><span>官方版本</span><strong>{officialVersion}</strong><small>{officialDate}</small></div>
            <Link to='/status' className='status-link'>查看完整状态 <ArrowRight size={17} /></Link>
          </div>
        </section>}

        {showNews && <section className='section news-section'>
          <div className='section-heading'><div><span className='eyebrow'>02 / TRANSMISSION</span><h2>最新公告</h2><p>记录每一次版本更新与项目进展。</p></div><Link to='/news' className='text-link'>查看全部公告 <ArrowRight size={16} /></Link></div>
          <div className='news-grid'>
            {news.slice(0, 3).map((item, index) => <Reveal key={item.id} delay={index * 100}><NewsCard news={item} featured={index === 0} /></Reveal>)}
          </div>
        </section>}

        {showTeam && <section className='manifesto'>
          <div><span className='eyebrow'>03 / OUR MISSION</span><h2>让故事，<br /><em>被更多人听见。</em></h2></div>
          <div className='manifesto-copy'><p>本地化不只是文字的转换，更是一次跨越语言的相遇。</p><Link to='/team' className='button button-dark'>认识汉化组 <ArrowRight size={17} /></Link></div>
        </section>}

        {(showDownloads || showTutorial || showStatus) && <section className='section quick-download'>
          <div className='section-heading'><span className='eyebrow'>04 / GET STARTED</span><h2>开始你的基沃托斯之旅</h2></div>
          <div className='quick-grid'>
            {showDownloads && <Link to='/download' className='ripple-btn'><Download size={22} /><span>汉化版客户端</span><small>ANDROID / WINDOWS</small><ArrowRight /></Link>}
            {showTutorial && <Link to='/tutorial' className='ripple-btn'><ArrowRight size={22} /><span>安装教程</span><small>GETTING STARTED</small><ArrowRight /></Link>}
            {showStatus && <Link to='/status' className='ripple-btn'><CalendarDays size={22} /><span>查看维护状态</span><small>AUTO VERSION CHECK</small><ArrowRight /></Link>}
          </div>
        </section>}
      </main>
    </>
  )
}
~~~

## Hero JSX 结构

~~~tsx
export default function Hero({ showNews = true, showStatus = true, showDownloads = true }) {
  const { settings, download, status } = useContent()
  const textTranslation = getStatusResource('textTranslation', status)
  const translateStatus = textTranslation ? getResourceStatus(textTranslation) : 'pending'

  return (
    <section className='hero'>
      <div className='hero-art'>
        <div className='hero-orbit orbit-one' />
        <div className='hero-orbit orbit-two' />
        <div className='hero-grid' />
        <div className='hero-glow' />
        <div className='hero-stamp'>BLUE<br />ARCHIVE<br /><span>LOCALIZATION</span></div>
        <div className='hero-figure'>
          <div className='figure-halo' />
          {showStatus && <div className='figure-card figure-card-main'><span>01</span><strong>文本汉化<br />{getStatusLabel(translateStatus)}</strong><em>{textTranslation?.resourceVersion || '待配置'}</em></div>}
          {showDownloads && <div className='figure-card figure-card-side figure-card-2'><span>02</span><strong>官方<br />版本</strong><em>{textTranslation?.officialVersion || '待配置'}</em></div>}
          {showStatus && <div className='figure-card figure-card-side figure-card-3'><span>03</span><strong>版本<br />校验</strong><em>{translateStatus === 'normal' ? 'SYNCED' : 'PENDING'}</em></div>}
          <div className='figure-silhouette'>BA</div>
        </div>
      </div>
      <div className='hero-copy'>
        <div className='eyebrow'><Sparkles size={14} /> PROJECT / BLUE ARCHIVE</div>
        <h1>{settings.siteTitle}<br /><em>汉化组</em></h1>
        <p className='hero-lead'>{settings.siteSubtitle}</p>
        <p className='hero-description'>我们是一群热爱《蔚蓝档案》的玩家，致力于让每一段故事、每一个角色，都能以最自然的中文与你相遇。</p>
        <div className='hero-actions'>
          {showDownloads && <Link to='/download' className='button button-primary'><ArrowDownToLine size={17} /> 获取资源</Link>}
          {showNews && <Link to='/news' className='button button-ghost'>查看公告 <ArrowRight size={17} /></Link>}
        </div>
      </div>
    </section>
  )
}
~~~

## Tailwind 配置

~~~js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
~~~

## 全局 CSS 核心

~~~css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #f0f4f8;
  --ink: #0f172a;
  --ink-soft: #334155;
  --ink-dim: #64748b;
  --ink-muted: #94a3b8;
  --cyan: #06b6d4;
  --cyan-strong: #0891b2;
  --cyan-border: rgba(6, 182, 212, 0.3);
  --glass-light: rgba(255, 255, 255, 0.48);
  --glass-medium: rgba(255, 255, 255, 0.65);
  --glass-heavy: rgba(255, 255, 255, 0.8);
  --border-subtle: rgba(0, 0, 0, 0.06);
  --shadow-sm: 0 2px 12px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 8px 30px rgba(0, 0, 0, 0.06);
  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 24px;
  --spring-soft: cubic-bezier(0.34, 1.32, 0.64, 1);
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: 'Noto Sans SC', sans-serif; -webkit-font-smoothing: antialiased; }
a { color: inherit; text-decoration: none; }
button, input, textarea { font: inherit; }

.app-shell { min-height: 100vh; position: relative; isolation: isolate; overflow-x: hidden; background-color: var(--bg); }
.section { max-width: 1240px; margin: 0 auto; padding: 93px 28px; position: relative; z-index: 1; }
.hero { min-height: 680px; display: grid; grid-template-columns: 1.04fr 0.96fr; position: relative; overflow: hidden; background: linear-gradient(160deg, #e8f4f8, #f0f9ff, #eef2f6); }
.hero-copy { max-width: 580px; padding: 100px 30px 65px clamp(28px, 8vw, 120px); position: relative; z-index: 2; }
.hero-art { position: relative; overflow: hidden; background: radial-gradient(ellipse 60% 35% at 55% 45%, rgba(6, 182, 212, 0.18), transparent 45%), linear-gradient(135deg, #e0eef5, #d4e8f0, #e8f0f5); }
.hero-grid { position: absolute; inset: 0; opacity: 0.12; background-image: linear-gradient(rgba(6, 182, 212, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.25) 1px, transparent 1px); background-size: 40px 40px; }
.hero-orbit { position: absolute; border: 1px solid rgba(6, 182, 212, 0.2); border-radius: 50%; aspect-ratio: 1; }
.button { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 18px; border-radius: var(--radius-sm); transition: transform 0.2s var(--spring-soft), color 0.2s, background 0.2s, border-color 0.2s; }
.button:active { transform: scale(0.96); }
.button-primary { color: #fff; background: var(--cyan-strong); }
.button-ghost { color: var(--ink-soft); border: 1px solid var(--border-subtle); background: var(--glass-light); }
.reveal { opacity: 0; will-change: opacity, transform; }
.reveal-in { opacity: 1; transform: translateY(0) scale(1); transition: opacity 0.6s var(--spring-soft), transform 0.65s var(--spring-soft); }

@media (max-width: 900px) { .hero { grid-template-columns: 1fr; } .hero-art { min-height: 420px; order: -1; } .hero-copy { max-width: none; padding: 58px 28px 76px; } }
@media (max-width: 640px) { .section { padding: 64px 18px; } .section-heading { display: block; } .hero h1 { font-size: 48px; } .hero-actions { flex-wrap: wrap; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
~~~

## 扩展约定

- 数据放在 src/data/ 或通过 ContentContext 获取。
- 页面负责组合区块，通用卡片、弹窗和加载状态放在 src/components/。
- 新增公开模块时同步更新 src/data/siteModules.ts、导航和页脚可见性。
- 全局视觉规则优先复用 src/styles.css 中的变量。
- 响应式检查覆盖桌面、平板和手机宽度；截图限制最长边，避免无关整页截图进入上下文。

