import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { Spine } from '@esotericsoftware/spine-pixi-v7';
import { Sparkles, Maximize2, Minimize2, RotateCcw, Volume2, VolumeX, MessageSquare, Hand, Eye } from 'lucide-react';

export interface HanakoLive2DProps {
  className?: string;
  autoPlay?: boolean;
  enableParallax?: boolean;
  showControls?: boolean;
  onInteract?: (actionName: string) => void;
  width?: number | string;
  height?: number | string;
}

const HANAKO_QUOTES = [
  '“微风吹过水面的声音……和老师的心跳声，哪一个更大呢？♡”',
  '“衣服湿透贴在身上的感觉……老师，不准移开视线哦？”',
  '“在只有两个人的海边……如果是老师的话，稍微做点坏事也没关系呢♡”',
  '“老师的手……要帮花子涂防晒油吗？要涂得很仔细才行哦~”',
  '“呼呼，老师的目光一直停留在这里呢……心跳好像变快了♡”',
  '“今天夏莱的工作就暂时忘记吧……现在只专心看着花子一个人好不好？”'
];

export default function HanakoLive2D({
  className = '',
  autoPlay = true,
  enableParallax = true,
  showControls = true,
  onInteract,
  width = '100%',
  height = '100%',
}: HanakoLive2DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const spineRef = useRef<Spine | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentQuote, setCurrentQuote] = useState(HANAKO_QUOTES[0]);
  const [showSpeech, setShowSpeech] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentAction, setCurrentAction] = useState('Idle_01');

  // Parallax target positions
  const mousePos = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0, rot: 0 });
  const basePosition = useRef({ x: 0, y: 0, scale: 1 });

  // Play animation clip safely
  const playAnimation = useCallback((animName: string, loop = false, track = 1) => {
    const spine = spineRef.current;
    if (!spine) return;

    try {
      if (track === 0) {
        spine.state.setAnimation(0, animName, loop);
      } else {
        // Overlay secondary action over the idle loop
        spine.state.setAnimation(track, animName, loop);
      }
      setCurrentAction(animName);
      onInteract?.(animName);
    } catch (err) {
      console.warn(`[HanakoLive2D] Failed to play animation: ${animName}`, err);
    }
  }, [onInteract]);

  // Handle interaction click / tap
  const handleStageClick = useCallback(() => {
    // Pick random voice line
    const quote = HANAKO_QUOTES[Math.floor(Math.random() * HANAKO_QUOTES.length)];
    setCurrentQuote(quote);
    setShowSpeech(true);

    // Pick interaction animations
    const reactions = ['Pat_01_A', 'Talk_01_A', 'Talk_02_A', 'Talk_03_A', 'Talk_04_A', 'Talk_05_A', 'Touch_Point', 'Touch_Eye'];
    const selected = reactions[Math.floor(Math.random() * reactions.length)];
    playAnimation(selected, false, 1);
  }, [playAnimation]);

  // Initialize Pixi & Spine
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let destroyed = false;
    let animFrameId: number;

    const init = async () => {
      try {
        setIsLoading(true);
        setLoadingProgress(15);

        const rect = container.getBoundingClientRect();
        const initialWidth = rect.width || 800;
        const initialHeight = rect.height || 600;

        // 1. Initialize PIXI Application
        const app = new PIXI.Application({
          width: initialWidth,
          height: initialHeight,
          backgroundAlpha: 0,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
          antialias: true,
        });

        if (destroyed || !containerRef.current) {
          app.destroy(true, { children: true, texture: true, baseTexture: true });
          return;
        }

        container.appendChild(app.view as unknown as Node);
        appRef.current = app;
        setLoadingProgress(35);

        // 2. Load Hanako Swimsuit Spine 4.2 Assets (ch0209_home)
        const skelUrl = '/l2d/hanako_swimsuit/ch0209_home.skel';
        const atlasUrl = '/l2d/hanako_swimsuit/ch0209_home.atlas';

        PIXI.Assets.add({ alias: 'hanako_sw_skel', src: skelUrl });
        PIXI.Assets.add({ alias: 'hanako_sw_atlas', src: atlasUrl });

        await PIXI.Assets.load(['hanako_sw_skel', 'hanako_sw_atlas']);
        setLoadingProgress(80);

        if (destroyed) return;

        // 3. Create Spine Instance
        const spine = Spine.from({
          skeleton: 'hanako_sw_skel',
          atlas: 'hanako_sw_atlas',
          autoUpdate: true,
        });

        spineRef.current = spine;

        // 4. Calculate Responsive Scaling & Complete Character Framing
        const updateLayout = () => {
          if (!container || !spine) return;
          const w = container.clientWidth || 800;
          const h = container.clientHeight || 600;
          app.renderer.resize(w, h);

          let scale: number;
          let focusX = 80;
          let focusY = -1050;

          if (w / h >= 1.5) {
            // Landscape / 16:9 widescreen or fullscreen
            scale = (h / 1500) * 1.02;
            focusX = 80;
            focusY = -1050;
          } else if (w >= 700) {
            // Desktop Hero Stage (e.g. 800-900w x 720h)
            scale = (h / 1350) * 1.05;
            focusX = 120;
            focusY = -1100;
          } else {
            // Mobile Portrait Stage (< 700px)
            scale = (h / 1450) * 1.0;
            focusX = -120;
            focusY = -1050;
          }

          basePosition.current = {
            x: w * 0.5 - focusX * scale,
            y: h * 0.5 - focusY * scale,
            scale,
          };

          spine.scale.set(scale);
          spine.position.set(basePosition.current.x, basePosition.current.y);
        };

        updateLayout();

        // 5. Initial Animation Queue
        if (autoPlay) {
          try {
            // Track 0: Start sequence then loop idle
            spine.state.setAnimation(0, 'Start_Idle_01', false);
            spine.state.addAnimation(0, 'Idle_01', true, 0);
          } catch {
            spine.state.setAnimation(0, 'Idle_01', true);
          }
        }

        app.stage.addChild(spine);
        setLoadingProgress(100);
        setIsLoading(false);

        // 6. Smooth Parallax & Idle Floating Render Loop
        const tick = () => {
          if (!destroyed && spine && enableParallax) {
            // Lerp towards target mouse offset
            const targetX = mousePos.current.x * 22;
            const targetY = mousePos.current.y * 14;
            const targetRot = mousePos.current.x * 0.015;

            currentOffset.current.x += (targetX - currentOffset.current.x) * 0.06;
            currentOffset.current.y += (targetY - currentOffset.current.y) * 0.06;
            currentOffset.current.rot += (targetRot - currentOffset.current.rot) * 0.06;

            spine.x = basePosition.current.x + currentOffset.current.x;
            spine.y = basePosition.current.y + currentOffset.current.y;
            spine.rotation = currentOffset.current.rot;
          }
          animFrameId = requestAnimationFrame(tick);
        };

        animFrameId = requestAnimationFrame(tick);

        // Resize handler
        const resizeObserver = new ResizeObserver(() => {
          updateLayout();
        });
        resizeObserver.observe(container);

        return () => {
          resizeObserver.disconnect();
        };
      } catch (err) {
        console.error('[HanakoLive2D] Failed to load model:', err);
        setIsLoading(false);
      }
    };

    init();

    return () => {
      destroyed = true;
      cancelAnimationFrame(animFrameId);
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true, texture: true, baseTexture: true });
        } catch {}
        appRef.current = null;
      }
      spineRef.current = null;
    };
  }, [autoPlay, enableParallax]);

  // Pointer move handler for parallax
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!enableParallax || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    mousePos.current = { x: nx * 2, y: ny * 2 };
  };

  const handlePointerLeave = () => {
    mousePos.current = { x: 0, y: 0 };
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const resetView = () => {
    mousePos.current = { x: 0, y: 0 };
    currentOffset.current = { x: 0, y: 0, rot: 0 };
    playAnimation('Idle_01', true, 0);
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none hanako-live2d-stage ${className}`}
      style={{ width, height }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onClick={handleStageClick}
    >
      {/* 1. Loading Glass Screen */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-md z-30 transition-opacity">
          <div className="relative flex items-center justify-center w-20 h-20 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-pink-500/30 animate-ping" />
            <div className="w-14 h-14 rounded-full border-2 border-t-pink-400 border-r-cyan-400 border-b-transparent border-l-transparent animate-spin" />
            <span className="text-xl">🌸</span>
          </div>
          <span className="text-sm font-semibold text-pink-300 tracking-wide mb-2">
            正在载入花子回忆大厅 Live2D · {loadingProgress}%
          </span>
          <div className="w-48 h-1.5 rounded-full bg-slate-800/80 overflow-hidden border border-white/10">
            <div
              className="h-full bg-gradient-to-r from-pink-500 via-rose-400 to-cyan-400 transition-all duration-300"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. Floating Affectionate Speech Bubble */}
      {showSpeech && !isLoading && (
        <div
          className="absolute top-6 left-6 max-w-sm p-4 rounded-2xl bg-slate-900/85 backdrop-blur-xl border border-pink-500/30 shadow-[0_8px_32px_rgba(255,92,138,0.25)] z-20 cursor-pointer transition-all hover:scale-105"
          onClick={(e) => {
            e.stopPropagation();
            handleStageClick();
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
            <span className="flex items-center gap-1 font-bold text-pink-400">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" /> 浦和花子 · 回忆大厅
            </span>
            <span className="text-[10px] text-slate-400 bg-pink-500/10 px-2 py-0.5 rounded-full border border-pink-500/20">
              点击互动 ♡
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-100 font-medium leading-relaxed">
            {currentQuote}
          </p>
        </div>
      )}

      {/* 3. Liquid Glass Interactive Controls Bar */}
      {showControls && !isLoading && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-20"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Action: Idle */}
          <button
            type="button"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
              currentAction === 'Idle_01'
                ? 'bg-pink-500/30 text-pink-300 border border-pink-400/50 shadow-[0_0_12px_rgba(255,92,138,0.4)]'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            onClick={() => playAnimation('Idle_01', true, 0)}
            title="空闲呼吸微动"
          >
            🌸 空闲
          </button>

          {/* Action: Talk */}
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-all"
            onClick={() => {
              const talks = ['Talk_01_A', 'Talk_02_A', 'Talk_03_A', 'Talk_04_A'];
              const anim = talks[Math.floor(Math.random() * talks.length)];
              playAnimation(anim, false, 1);
            }}
            title="交谈互动"
          >
            <MessageSquare className="w-3.5 h-3.5" /> 倾听
          </button>

          {/* Action: Headpat */}
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-all"
            onClick={() => playAnimation('Pat_01_A', false, 1)}
            title="温柔抚摸"
          >
            <Hand className="w-3.5 h-3.5" /> 抚摸
          </button>

          {/* Action: Touch Water */}
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-all"
            onClick={() => playAnimation('Touch_Point', false, 1)}
            title="触碰池水"
          >
            <Eye className="w-3.5 h-3.5" /> 触碰
          </button>

          <div className="w-[1px] h-4 bg-white/15 mx-1" />

          {/* Reset position */}
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            onClick={resetView}
            title="重置视角与姿态"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Audio toggle */}
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? '开启声音' : '静音'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-pink-400" />}
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            onClick={toggleFullscreen}
            title={isFullscreen ? '退出全屏' : '全屏鉴赏'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
