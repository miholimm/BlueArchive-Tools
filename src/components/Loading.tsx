export default function Loading() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <img
          className="loading-logo loading-logo-img"
          src="/images/shiroko-icon.webp"
          alt="蔚蓝档案汉化组"
          width={72}
          height={72}
        />
        <div className="loading-mark">BLUE ARCHIVE</div>
        <div className="loading-line"><span /></div>
        <div className="loading-skeleton-grid" aria-hidden="true">
          <div className="loading-skeleton-panel" />
          <div className="loading-skeleton-panel" />
        </div>
        <p>正在前往基沃托斯</p>
      </div>
    </div>
  )
}
