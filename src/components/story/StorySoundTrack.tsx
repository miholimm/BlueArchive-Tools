import React, { useState, useRef, useEffect } from 'react'
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  ExternalLink,
  Users,
  Mic,
  Disc,
  Sparkles,
} from 'lucide-react'
import type { BgmTrackInfo, StudentCastInfo } from '../../lib/storyAudio'

export interface StorySoundTrackProps {
  playlist: BgmTrackInfo[]
  cast: StudentCastInfo[]
  chapterTitle?: string
  activeBgmId?: number
  onSelectBgm?: (bgm: BgmTrackInfo) => void
}

export default function StorySoundTrack({
  playlist,
  cast,
  chapterTitle = '当前章节',
  activeBgmId,
  onSelectBgm,
}: StorySoundTrackProps) {
  const [activeTab, setActiveTab] = useState<'bgm' | 'cast'>('bgm')

  // BGM 播放器状态
  const [currentTrack, setCurrentTrack] = useState<BgmTrackInfo | null>(playlist[0] || null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 当外部 activeBgmId 变动时，高亮或自动切换
  useEffect(() => {
    if (activeBgmId) {
      const match = playlist.find((p) => p.id === activeBgmId)
      if (match && match.id !== currentTrack?.id) {
        // 不打断当前手动播放，仅在未播放时同步
        if (!isPlaying) {
          setCurrentTrack(match)
        }
      }
    }
  }, [activeBgmId, playlist, currentTrack, isPlaying])

  // 更新音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // 播放 / 暂停切换
  const togglePlayTrack = (track: BgmTrackInfo) => {
    if (currentTrack?.id === track.id && isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
      return
    }

    setCurrentTrack(track)
    onSelectBgm?.(track)

    if (!audioRef.current) {
      audioRef.current = new Audio()
    }
    audioRef.current.src = track.streamUrl
    audioRef.current.volume = isMuted ? 0 : volume
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true)
      })
      .catch((err) => {
        console.warn('BGM play failed:', err)
        setIsPlaying(false)
      })
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration)
      }
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = val
      setCurrentTime(val)
    }
  }

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="ba-soundtrack-container">
      {/* 隐藏的 BGM Audio 元素 */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />

      {/* 顶栏 Tab 切换 */}
      <div className="ba-soundtrack-header">
        <div className="ba-soundtrack-tabs">
          <button
            type="button"
            className={`ba-soundtrack-tab ${activeTab === 'bgm' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('bgm')}
          >
            <Disc size={15} />
            <span>原声配乐 BGM ({playlist.length})</span>
          </button>
          <button
            type="button"
            className={`ba-soundtrack-tab ${activeTab === 'cast' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('cast')}
          >
            <Users size={15} />
            <span>登场声优 CAST ({cast.length})</span>
          </button>
        </div>

        <span className="ba-soundtrack-chapter-tag">{chapterTitle}</span>
      </div>

      {/* BGM 原声带面板 */}
      {activeTab === 'bgm' && (
        <div className="ba-soundtrack-body">
          {/* 迷你播放控制栏 */}
          {currentTrack && (
            <div className="ba-soundtrack-now-playing">
              <div className="ba-soundtrack-now-info">
                <div className={`ba-soundtrack-vinyl ${isPlaying ? 'is-spinning' : ''}`}>
                  <Music size={16} />
                </div>
                <div className="ba-soundtrack-now-text">
                  <div className="ba-soundtrack-now-title">
                    <span>{currentTrack.themeName} · {currentTrack.title}</span>
                    <span className="ba-soundtrack-badge-cat">{currentTrack.category}</span>
                  </div>
                  <div className="ba-soundtrack-now-composer">
                    作曲 / 编曲：{currentTrack.composer} · 蔚蓝档案官方原声带
                  </div>
                </div>
              </div>

              {/* 播放控制与进度 */}
              <div className="ba-soundtrack-controls">
                <button
                  type="button"
                  className="ba-soundtrack-play-btn"
                  onClick={() => togglePlayTrack(currentTrack)}
                  title={isPlaying ? '暂停' : '播放'}
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>

                <div className="ba-soundtrack-progress-wrap">
                  <span className="ba-soundtrack-time">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.5}
                    value={currentTime}
                    onChange={handleSeek}
                    className="ba-soundtrack-slider"
                  />
                  <span className="ba-soundtrack-time">{formatTime(duration)}</span>
                </div>

                <div className="ba-soundtrack-volume-wrap">
                  <button
                    type="button"
                    className="ba-soundtrack-vol-btn"
                    onClick={() => setIsMuted(!isMuted)}
                    title={isMuted ? '取消静音' : '静音'}
                  >
                    {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      setVolume(parseFloat(e.target.value))
                      setIsMuted(false)
                    }}
                    className="ba-soundtrack-vol-slider"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 曲目列表 */}
          <div className="ba-soundtrack-list">
            {playlist.length === 0 ? (
              <div className="ba-soundtrack-empty">本章节未检测到独立 BGM 音轨</div>
            ) : (
              playlist.map((track) => {
                const isSelected = currentTrack?.id === track.id
                const isPlayingThis = isSelected && isPlaying

                return (
                  <div
                    key={track.id}
                    className={`ba-soundtrack-item ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => togglePlayTrack(track)}
                  >
                    <div className="ba-soundtrack-item-left">
                      <button
                        type="button"
                        className={`ba-soundtrack-item-play ${isPlayingThis ? 'is-playing' : ''}`}
                        title={isPlayingThis ? '暂停' : '播放'}
                      >
                        {isPlayingThis ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                      <div className="ba-soundtrack-item-names">
                        <span className="ba-soundtrack-item-title">
                          {track.themeName} · {track.title}
                        </span>
                        <span className="ba-soundtrack-item-meta">
                          {track.composer}
                          {typeof track.firstLineIndex === 'number' && track.firstLineIndex > 0 && (
                            <span className="ba-soundtrack-appear-tag">
                              登场于第 {track.firstLineIndex} 句
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="ba-soundtrack-item-right">
                      <span className="ba-soundtrack-cat-pill">{track.category}</span>
                      <a
                        href={track.streamUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ba-soundtrack-ext-link"
                        onClick={(e) => e.stopPropagation()}
                        title="在新标签页中打开音频流文件"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* 登场角色与 CV 面板 */}
      {activeTab === 'cast' && (
        <div className="ba-soundtrack-body">
          <div className="ba-cast-grid">
            {cast.length === 0 ? (
              <div className="ba-soundtrack-empty">本章节暂无特定学生角色登场（多为旁白或环境交互）</div>
            ) : (
              cast.map((student) => {
                return (
                  <div
                    key={student.name}
                    className="ba-cast-card"
                    style={{
                      borderLeftColor: student.academy.themeColor,
                    }}
                  >
                    <div className="ba-cast-avatar-box">
                      <img
                        src={student.portrait}
                        alt={student.name}
                        className="ba-cast-avatar"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = '/images/portraits/default.webp'
                        }}
                      />
                      <span
                        className="ba-cast-academy-dot"
                        style={{ background: student.academy.themeColor }}
                        title={student.academy.name}
                      />
                    </div>

                    <div className="ba-cast-info">
                      <div className="ba-cast-names-row">
                        <h4 className="ba-cast-name">{student.name}</h4>
                        {student.nameJp && (
                          <span className="ba-cast-name-jp">{student.nameJp}</span>
                        )}
                      </div>

                      <div className="ba-cast-cv-row">
                        <Mic size={13} className="ba-cast-cv-icon" />
                        <span className="ba-cast-cv-label">CV:</span>
                        <span className="ba-cast-cv-name">{student.cvName}</span>
                        {student.cvJp && (
                          <span className="ba-cast-cv-jp">({student.cvJp})</span>
                        )}
                      </div>

                      <div className="ba-cast-badges">
                        <span
                          className="ba-cast-academy-badge"
                          style={{
                            background: student.academy.badgeBg,
                            color: student.academy.themeColor,
                          }}
                        >
                          {student.academy.name}
                        </span>
                        <span className="ba-cast-lines-badge">
                          发言 {student.linesCount} 次
                        </span>
                        {student.voicedCount > 0 && (
                          <span className="ba-cast-voiced-badge">
                            <Sparkles size={11} /> 语音 {student.voicedCount} 句
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
