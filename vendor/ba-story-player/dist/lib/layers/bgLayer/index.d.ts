import { Application, Sprite } from 'pixi.js';
export declare function bgInit(): void;
/**
 * 计算图片 cover 样式尺寸 - utils
 */
export declare function calcBackgroundImageSize(background: Sprite, app: Application): {
    x: number;
    y: number;
    scale: number;
};
