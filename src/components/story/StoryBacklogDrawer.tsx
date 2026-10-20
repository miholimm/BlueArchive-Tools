import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  X,
  Volume2,
  VolumeX,
  Search,
  Check,
  Copy,
  Music,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Filter,
} from 'lucide-react'
import type { StoryBacklogLine, BgmTrackInfo } from '../../lib/storyAudio'

export interface StoryBacklogDrawerProps {
  isOpen: boolean
  onClose: () => void
  backlog: StoryBacklogLine[]
  chapterTitle?: string
  onPlayBgm?: (bgm: BgmTrackInfo) => void
  activeBgmId?: number
}

type LangDisplayMode = 'both' | 'cn' | 'jp'

export default function StoryBacklogDrawer({
  isOpen,
  onClose,
  backlog,
  chapterTitle = '当前章节',
  onPlayBgm,
  activeBgmId,
}: StoryBacklogDrawerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [langMode, setLangMode] = useState<LangDisplayMode>('both')
  const [onlyVoiced, setOnlyVoiced] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [playingVoiceUrl, setPlayingVoiceUrl] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  // 快捷键 ESC 关闭
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // 停止语音播放
  const stopVoice = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setPlayingVoiceUrl(null)
  }

  // 播放单条语音
  const playVoice = (url?: string) => {
    if (!url) return
    if (playingVoiceUrl === url) {
      stopVoice()
      return
    }

    if (!audioRef.current) {
      audioRef.current = new Audio()
    }
    audioRef.current.src = url
    audioRef.current.volume = 0.85
    audioRef.current
      .play()
      .then(() => {
        setPlayingVoiceUrl(url)
      })
      .catch((err) => {
        console.warn('Voice playback failed:', err)
        setPlayingVoiceUrl(null)
      })

    audioRef.current.onended = () => {
      setPlayingVoiceUrl(null)
    }
    audioRef.current.onerror = () => {
      setPlayingVoiceUrl(null)
    }
  }

  // 复制文本
  const copyText = (line: StoryBacklogLine) => {
    const textToCopy = `[${line.speaker}] ${line.textCn}${line.textJp ? `\n（${line.textJp}）` : ''}`
    navigator.clipboard?.writeText(textToCopy).then(() => {
      setCopiedId(line.id)
      setTimeout(() => setCopiedId(null), 1800)
    })
  }

  // 滚动到顶部 / 底部
  const scrollToTop = () => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
    }
  }

  // 过滤后的列表
  const filteredLines = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return backlog.filter((line) => {
      if (onlyVoiced && !line.voiceUrl) return false
      if (!q) return true
      return (
        line.speaker.toLowerCase().includes(q) ||
        line.textCn.toLowerCase().includes(q) ||
        line.textJp.toLowerCase().includes(q)
      )
    })
  }, [backlog, searchTerm, onlyVoiced])

  const totalVoiced = useMemo(() => backlog.filter((l) => !!l.voiceUrl).length, [backlog])

  if (!isOpen) return null

  return (
    <div className="ba-backlog-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="ba-backlog-drawer"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* 抽屉头部 */}
        <div className="ba-backlog-header">
          <div className="ba-backlog-header-info">
            <span className="ba-backlog-eyebrow">
              <Sparkles size={13} />
              DIALOGUE BACKLOG · 对话回溯
            </span>
            <h2 className="ba-backlog-title">{chapterTitle}</h2>
            <div className="ba-backlog-stats-strip">
              <span className="ba-backlog-stat-pill">全章 {backlog.length} 条对白</span>
              {totalVoiced > 0 && (
                <span className="ba-backlog-stat-pill is-highlight">
                  <Volume2 size={12} /> {totalVoiced} 条包含语音
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="ba-backlog-close-btn"
            onClick={onClose}
            title="关闭回溯 (ESC)"
          >
            <X size={20} />
          </button>
        </div>

        {/* 控制与筛选工具栏 */}
        <div className="ba-backlog-toolbar">
          <div className="ba-backlog-search-wrap">
            <Search size={14} className="ba-backlog-search-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索角色名或剧情对话内容…"
              className="ba-backlog-search-input"
            />
            {searchTerm && (
              <button
                type="button"
                className="ba-backlog-search-clear"
                onClick={() => setSearchTerm('')}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="ba-backlog-filters">
            <div className="ba-backlog-lang-group">
              <button
                type="button"
                className={`ba-backlog-btn-pill ${langMode === 'both' ? 'is-active' : ''}`}
                onClick={() => setLangMode('both')}
              >
                中日双语
              </button>
              <button
                type="button"
                className={`ba-backlog-btn-pill ${langMode === 'cn' ? 'is-active' : ''}`}
                onClick={() => setLangMode('cn')}
              >
                中文
              </button>
              <button
                type="button"
                className={`ba-backlog-btn-pill ${langMode === 'jp' ? 'is-active' : ''}`}
                onClick={() => setLangMode('jp')}
              >
                日本語
              </button>
            </div>

            {totalVoiced > 0 && (
              <button
                type="button"
                className={`ba-backlog-filter-btn ${onlyVoiced ? 'is-active' : ''}`}
                onClick={() => setOnlyVoiced(!onlyVoiced)}
                title="只查看包含日文原版语音的台词"
              >
                <Filter size={12} />
                <span>仅看有声 ({totalVoiced})</span>
              </button>
            )}

            <div className="ba-backlog-scroll-actions">
              <button
                type="button"
                className="ba-backlog-icon-btn"
                onClick={scrollToTop}
                title="滚动到顶部"
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                className="ba-backlog-icon-btn"
                onClick={scrollToBottom}
                title="滚动到底部"
              >
                <ArrowDown size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* 对话列表区 */}
        <div className="ba-backlog-list" ref={listRef}>
          {filteredLines.length === 0 ? (
            <div className="ba-backlog-empty">
              <span>未找到匹配的对话记录</span>
            </div>
          ) : (
            filteredLines.map((line) => {
              const isPlayingVoice = playingVoiceUrl === line.voiceUrl
              const isCopied = copiedId === line.id
              const isCurrentBgm = activeBgmId && line.bgmId === activeBgmId

              return (
                <div
                  key={line.id}
                  className={`ba-backlog-card type-${line.speakerType}${line.isChoice ? ' is-choice' : ''}`}
                >
                  {/* BGM 切换插槽 */}
                  {line.isBgmChange && line.bgmInfo && (
                    <div className="ba-backlog-bgm-banner">
                      <div className="ba-backlog-bgm-info">
                        <Music size={13} className="spin-slow" />
                        <span className="ba-backlog-bgm-label">伴奏切换</span>
                        <span className="ba-backlog-bgm-name">
                          {line.bgmInfo.themeName} · {line.bgmInfo.title}
                        </span>
                      </div>
                      {onPlayBgm && (
                        <button
                          type="button"
                          className={`ba-backlog-bgm-play-btn ${isCurrentBgm ? 'is-playing' : ''}`}
                          onClick={() => onPlayBgm(line.bgmInfo!)}
                        >
                          {isCurrentBgm ? '播放中' : '试听'}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="ba-backlog-card-body">
                    {/* 说话人栏 */}
                    <div className="ba-backlog-speaker-row">
                      <div className="ba-backlog-speaker-main">
                        {line.speakerPortrait ? (
                          <img
                            src={line.speakerPortrait}
                            alt={line.speaker}
                            className="ba-backlog-avatar"
                            onError={(e) => {
                              ;(e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <div
                            className={`ba-backlog-avatar-placeholder ${
                              line.speakerType === 'sensei'
                                ? 'is-sensei'
                                : line.speakerType === 'system'
                                ? 'is-system'
                                : ''
                            }`}
                          >
                            {line.speaker.slice(0, 1)}
                          </div>
                        )}

                        <span
                          className="ba-backlog-speaker-name"
                          style={{
                            color: line.academy?.themeColor || undefined,
                          }}
                        >
                          {line.speaker}
                        </span>

                        {line.academy && line.speakerType === 'student' && (
                          <span
                            className="ba-backlog-academy-tag"
                            style={{
                              background: line.academy.badgeBg,
                              color: line.academy.themeColor,
                            }}
                          >
                            {line.academy.name}
                          </span>
                        )}

                        {line.isChoice && (
                          <span className="ba-backlog-choice-tag">分支选项</span>
                        )}
                      </div>

                      <div className="ba-backlog-line-actions">
                        <span className="ba-backlog-line-idx">#{line.index}</span>

                        {/* 语音试听按钮 */}
                        {line.voiceUrl && (
                          <button
                            type="button"
                            className={`ba-backlog-voice-btn ${isPlayingVoice ? 'is-playing' : ''}`}
                            onClick={() => playVoice(line.voiceUrl)}
                            title={isPlayingVoice ? '停止试听' : '试听原声语音'}
                          >
                            {isPlayingVoice ? (
                              <>
                                <VolumeX size={13} />
                                <span>停止</span>
                              </>
                            ) : (
                              <>
                                <Volume2 size={13} />
                                <span>语音</span>
                              </>
                            )}
                          </button>
                        )}

                        {/* 复制文本按钮 */}
                        <button
                          type="button"
                          className="ba-backlog-copy-btn"
                          onClick={() => copyText(line)}
                          title="复制对白文本"
                        >
                          {isCopied ? <Check size={13} /> : <Copy size={13} />}
                        </button>
                      </div>
                    </div>

                    {/* 对白内容 */}
                    <div className="ba-backlog-dialogue">
                      {(langMode === 'both' || langMode === 'cn') && line.textCn && (
                        <p className="ba-backlog-text-cn">{line.textCn}</p>
                      )}
                      {(langMode === 'both' || langMode === 'jp') && line.textJp && (
                        <p className="ba-backlog-text-jp">{line.textJp}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 抽屉底部 */}
        <div className="ba-backlog-footer">
          <span className="ba-backlog-footer-hint">
            提示：支持键盘 ESC 键快速关闭回溯 · 点击「语音」按钮可单句独立试听
          </span>
          <button type="button" className="ba-backlog-footer-close" onClick={onClose}>
            返回播放
          </button>
        </div>
      </div>
    </div>
  )
}
