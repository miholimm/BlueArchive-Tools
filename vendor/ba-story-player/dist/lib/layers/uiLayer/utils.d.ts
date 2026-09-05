import { Language } from '../../types/store';
declare function effectBtnMouseDown(duration?: number, scale?: number): (ev: Event) => void;
declare function effectBtnMouseUp(duration?: number, scale?: number): (ev: Event) => void;
/**
 * 按钮动画
 * @args 控制动画参数
 *  args.durationDown: 按下去的动画时间
 *  args.scaleDown: 按下按钮，按钮的 scale 变化量
 *  args.durationUp: 松开按钮的动画时间
 *  args.scaleUp: 松开按钮的 scale 变化量
 */
declare function buttonAnimation(elem: {
    cssSelector?: string;
    elem?: Element;
    elems?: Element[];
}, args?: {
    scaleDown: number;
    durationDown: number;
    scaleUp: number;
    durationUp: number;
}): void;
export { buttonAnimation, effectBtnMouseDown, effectBtnMouseUp };
declare const dict: {
    cn: {
        log: string;
        summary: string;
        close: string;
        setting: string;
        volume: string;
        "volume-master": string;
        "volume-bg": string;
        "volume-fx": string;
        "volume-voice": string;
        "volume-mute": string;
        about: string;
        playing: string;
        "playing-speed": string;
        "playing-speed-desc": string;
        "playing-speed-fast": string;
        "playing-speed-normal": string;
        "playing-speed-slow": string;
        "playing-custom-setting": string;
        "playing-custom-setting-millisecond": string;
        "about-inside": string;
    };
    en: {
        log: string;
        summary: string;
        close: string;
        setting: string;
        volume: string;
        "volume-master": string;
        "volume-bg": string;
        "volume-fx": string;
        "volume-voice": string;
        "volume-mute": string;
        about: string;
        playing: string;
        "playing-speed": string;
        "playing-speed-desc": string;
        "playing-speed-fast": string;
        "playing-speed-normal": string;
        "playing-speed-slow": string;
        "playing-custom-setting": string;
        "playing-custom-setting-millisecond": string;
        "about-inside": string;
    };
    jp: {
        log: string;
        summary: string;
        close: string;
        setting: string;
        volume: string;
        "volume-master": string;
        "volume-bg": string;
        "volume-fx": string;
        "volume-voice": string;
        "volume-mute": string;
        about: string;
        playing: string;
        "playing-speed": string;
        "playing-speed-desc": string;
        "playing-speed-fast": string;
        "playing-speed-normal": string;
        "playing-speed-slow": string;
        "playing-custom-setting": string;
        "playing-custom-setting-millisecond": string;
        "about-inside": string;
    };
    kr: {
        log: string;
        summary: string;
        close: string;
        setting: string;
        volume: string;
        "volume-master": string;
        "volume-bg": string;
        "volume-fx": string;
        "volume-voice": string;
        "volume-mute": string;
        about: string;
        playing: string;
        "playing-speed": string;
        "playing-speed-desc": string;
        "playing-speed-fast": string;
        "playing-speed-normal": string;
        "playing-speed-slow": string;
        "playing-custom-setting": string;
        "playing-custom-setting-millisecond": string;
        "about-inside": string;
    };
    tw: {
        log: string;
        summary: string;
        close: string;
        setting: string;
        volume: string;
        "volume-master": string;
        "volume-bg": string;
        "volume-fx": string;
        "volume-voice": string;
        "volume-mute": string;
        about: string;
        playing: string;
        "playing-speed": string;
        "playing-speed-desc": string;
        "playing-speed-fast": string;
        "playing-speed-normal": string;
        "playing-speed-slow": string;
        "playing-custom-setting": string;
        "playing-custom-setting-millisecond": string;
        "about-inside": string;
    };
    th: {
        log: string;
        summary: string;
        close: string;
        setting: string;
        volume: string;
        "volume-master": string;
        "volume-bg": string;
        "volume-fx": string;
        "volume-voice": string;
        "volume-mute": string;
        about: string;
        playing: string;
        "playing-speed": string;
        "playing-speed-desc": string;
        "playing-speed-fast": string;
        "playing-speed-normal": string;
        "playing-speed-slow": string;
        "playing-custom-setting": string;
        "playing-custom-setting-millisecond": string;
        "about-inside": string;
    };
};
export declare function closestNumber(number: number, arr: number[]): number;
export declare function getUiI18n<key extends keyof (typeof dict)["cn"]>(key: string, language: Language): string;
