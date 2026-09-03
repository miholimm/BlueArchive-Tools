import { useEffect, useRef } from 'react'
import { createApp, type App as VueApp } from 'vue'
import 'ba-story-player/dist/style.css'

export type StoryLanguage = 'Cn' | 'Jp' | 'En' | 'Tw'

export interface BaStoryPlayerBridgeProps {
  /** Raw/translated story payload consumed by ba-story-player (StoryRawUnit[] or TranslatedStoryUnit). */
  story: unknown
  /** CDN base for live2D / voices / backgrounds. */
  dataUrl?: string
  language?: StoryLanguage
  width?: number
  height?: number
  startFullScreen?: boolean
  useMp3?: boolean
  useSuperSampling?: '' | '2' | '4' | boolean
  storySummary?: { chapterName: string; summary: string }
}

const DEFAULT_DATA_URL = 'https://yuuka.cdn.diyigemt.com/image/ba-all-data'

/**
 * Mounts the community Vue 3 + PixiJS `ba-story-player` inside a React tree.
 * The component is loaded via dynamic import so it is split into its own chunk
 * (Vue + Pixi stay out of the main bundle) and TypeScript never has to resolve
 * the prebuilt package's typings.
 */
export default function BaStoryPlayerBridge(props: BaStoryPlayerBridgeProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !props.story) return

    let app: VueApp<unknown> | null = null
    let cancelled = false

    import('ba-story-player')
      .then((mod) => {
        if (cancelled || !el) return
        const StoryPlayerComponent = (mod as { default: unknown }).default as Parameters<typeof createApp>[0]
        const width = (props.width ?? el.clientWidth) || 1000
        const height = props.height ?? Math.round((width * 9) / 16)

        app = createApp(StoryPlayerComponent, {
          story: props.story,
          dataUrl: props.dataUrl ?? DEFAULT_DATA_URL,
          language: props.language ?? 'Cn',
          width,
          height,
          startFullScreen: props.startFullScreen ?? false,
          useMp3: props.useMp3 ?? true,
          useSuperSampling: props.useSuperSampling ?? false,
          storySummary: props.storySummary ?? { chapterName: '蔚蓝档案', summary: '汉化组剧情演示' },
        })
        app.mount(el)
      })
      .catch((error) => {
        console.error('[BaStoryPlayer] failed to load engine', error)
      })

    return () => {
      cancelled = true
      try {
        app?.unmount()
      } catch {
        /* component may not have mounted yet */
      }
    }
  }, [props.story, props.dataUrl, props.language, props.width, props.height, props.startFullScreen, props.useMp3, props.useSuperSampling, props.storySummary])

  return <div ref={containerRef} className="ba-story-player-mount" />
}
