export type NewsItem = { id: string; title: string; date: string; author: string; cover: string; content: string }
export type Member = { name: string; avatar: string; role: string; description: string; joinTime: string }
export type DownloadItem = { name: string; version: string; description: string; updated: string; url: string; size?: string; checksum?: { md5?: string; sha256?: string }; diff?: { url: string; size: string } }
export type DownloadData = Record<'android' | 'windows' | 'ios' | 'macos', DownloadItem[]>
export type StatusKey = 'normal' | 'error' | 'pending'
export type StatusOverride = 'none' | 'normal' | 'error'
export type StatusResourceId =
  | 'androidClient'
  | 'windowsClient'
  | 'iosClient'
  | 'macosClient'
  | 'textTranslation'
  | 'cnVoice'
  | 'krVoice'
  | 'illustration'
  | 'announcement'
export type StatusResource = {
  id: StatusResourceId
  resourceVersion: string
  resourceUpdatedAt: string
  officialVersion: string
  officialUpdatedAt: string
  forcedStatus: StatusOverride
}
export type StatusResourceDefinition = {
  id: StatusResourceId
  label: string
}
export type StatusData = { resources: StatusResource[] }
export type TutorialStep = { title: string; desc: string }
export type TutorialError = { error: string; fix: string }
export type PlatformTutorial = { platform: string; label: string; icon: string; steps: TutorialStep[]; commonErrors: TutorialError[] }
export type FaqItem = { category: string; q: string; a: string }
export type VisibilityMode = 'public' | 'admin' | 'disabled'
export type ThemePreference = 'light' | 'dark' | 'system'
export type SiteModuleId = 'home' | 'team' | 'news' | 'downloads' | 'status' | 'changelog' | 'tutorial' | 'faq' | 'story' | 'feedback' | 'contributors' | 'antiCheat' | 'glossary' | 'qa' | 'apiDocs' | 'workspace' | 'archive'
export type ModuleVisibility = Record<SiteModuleId, VisibilityMode>
export type GoogleAdsSlots = {
  homeBanner?: string
  downloadBanner?: string
  storyReaderBottom?: string
  qaBanner?: string
  footerBanner?: string
}

export type GoogleAdsConfig = {
  enabled: boolean
  clientId: string
  autoAds: boolean
  testMode: boolean
  showPlaceholder: boolean
  adsTxt?: string
  slots: GoogleAdsSlots
}

export type SiteSettings = {
  siteTitle: string
  siteSubtitle: string
  wallpaper: string
  backgroundDim: number
  accent: string
  theme: ThemePreference
  moduleVisibility: ModuleVisibility
  ads?: GoogleAdsConfig
}

// 剧情相关
export interface StoryChapter {
  volume: number
  chapter: number
  title: string
  titleJa: string
  characters: string[]
  segments: StorySegment[]
}
export interface StorySegment {
  id: string
  speaker: string
  speakerJa?: string
  ja: string
  zh: string
  context?: string
  portrait?: string
  portraitSide?: 'left' | 'right'
}

// 历史版本
export interface ArchiveItem {
  version: string
  date: string
  gameVersion: string
  size: string
  changelogRef?: string
  downloadUrl: string
}

// 反馈
export interface FeedbackItem {
  id: string
  chapter: string
  original: string
  translation: string
  suggestion: string
  status: 'pending' | 'replied' | 'adopted' | 'rejected'
  createdAt: string
  reply?: string
}

export interface FeedbackSummary {
  id: string
  chapter: string
  status: FeedbackItem['status']
  createdAt: string
  updatedAt?: string
  reply?: string
}

// 评论
export interface CommentItem {
  id: string
  parentId?: string
  author: string
  content: string
  createdAt: string
  status: 'pending' | 'approved' | 'rejected'
}

// 反作弊
export interface AntiCheatServer {
  server: string
  status: 'safe' | 'warning' | 'danger'
  lastUpdate: string
  events: AntiCheatEvent[]
}
export interface AntiCheatEvent {
  date: string
  title: string
  description: string
}

// 贡献者
export interface ContributorItem {
  name: string
  avatar?: string
  translationCount: number
  feedbackAdopted: number
  commentsCount: number
}

// 章节索引
export interface ChapterIndexEntry {
  volume: number
  chapters: number[]
}

// ── 阶段四：生态扩展类型 ──

/** API Key 条目 */
export interface ApiKeyEntry {
  id: string
  name: string
  keyPreview: string
  rateLimitPerMin: number
  rateLimitPerHour: number
  createdAt: string
  revoked: boolean
}

/** 任务条目 */
export interface TaskEntry {
  id: string
  chapter: string
  title: string
  description: string
  status: 'open' | 'claimed' | 'submitted' | 'approved' | 'rejected'
  claimant: string
  claimantId?: string
  contact: string
  claimedAt?: string
  submittedAt?: string
  createdAt: string
}

/** 术语条目 */
export interface GlossaryTerm {
  id: string
  ja: string
  zh: string
  romaji: string
  category: string
  note: string
  createdAt: string
}

/** QA 问答 */
export interface QAQuestion {
  id: string
  title: string
  content: string
  tags: string[]
  author: string
  votes: number
  answerCount?: number
  answers: QAAnswer[]
  status: 'open' | 'answered' | 'closed'
  createdAt: string
}

export interface QAAnswer {
  id: string
  content: string
  author: string
  votes: number
  accepted: boolean
  createdAt: string
}

/** 翻译进度 */
export interface TranslationProgress {
  chapter: string
  total: number
  translated: number
  reviewed: number
  lastUpdated: string
}
