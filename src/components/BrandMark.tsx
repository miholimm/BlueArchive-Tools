// 品牌标识：白子（砂狼白子）游戏内头像
// 本地资产：public/images/shiroko-icon.webp（来源 SchaleDB，仅用于非官方粉丝汉化项目）
export default function BrandMark({ size = 38 }: { size?: number }) {
  return (
    <img
      className="brand-mark brand-mark-img"
      src="/images/shiroko-icon.webp"
      alt="蔚蓝档案汉化组"
      width={size}
      height={size}
      loading="eager"
      decoding="async"
    />
  )
}
