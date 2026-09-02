export default function Loading() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">BA</div>
        <div className="loading-mark">BLUE ARCHIVE</div>
        <div className="loading-line"><span /></div>
        <div className="loading-skeleton-grid" aria-hidden="true">
          <div className="loading-skeleton-panel" />
          <div className="loading-skeleton-panel" />
        </div>
        <p>正在同步夏莱终端数据</p>
      </div>
    </div>
  )
}
