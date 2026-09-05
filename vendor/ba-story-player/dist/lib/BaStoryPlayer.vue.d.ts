import { StoryRawUnit, TranslatedStoryUnit } from './types/common';
import { Language, StorySummary } from './types/store';
export type PlayerProps = {
    story: TranslatedStoryUnit;
    dataUrl: string;
    width: number;
    height: number;
    language: Language;
    userName: string;
    storySummary: StorySummary;
    startFullScreen?: boolean;
    useMp3?: boolean;
    useSuperSampling?: "2" | "4" | "" | boolean;
    /** 跳转至传入的 index */
    changeIndex?: number;
    /**
     * 播放结束等待多久后退出全屏操作
     */
    exitFullscreenTimeOut?: number;
};
declare function hotReplaceStoryUnit(unit: StoryRawUnit | StoryRawUnit[] | TranslatedStoryUnit, index: number, textOnly?: boolean): void;
declare function resetLive2d(): void;
declare const _default: import('vue').DefineComponent<PlayerProps, {
    hotReplaceStoryUnit: typeof hotReplaceStoryUnit;
    resetLive2d: typeof resetLive2d;
    app: Readonly<import('vue').Ref<import('pixi.js').Application<import('pixi.js').ICanvas>, import('pixi.js').Application<import('pixi.js').ICanvas>>>;
}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    end: (...args: any[]) => void;
    error: (...args: any[]) => void;
    initiated: (...args: any[]) => void;
}, string, import('vue').PublicProps, Readonly<PlayerProps> & Readonly<{
    onEnd?: ((...args: any[]) => any) | undefined;
    onError?: ((...args: any[]) => any) | undefined;
    onInitiated?: ((...args: any[]) => any) | undefined;
}>, {
    useMp3: boolean;
    startFullScreen: boolean;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {
    player: HTMLDivElement;
}, HTMLDivElement>;
export default _default;
