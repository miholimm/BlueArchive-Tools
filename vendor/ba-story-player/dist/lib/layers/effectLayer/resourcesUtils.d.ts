import { Sprite, Spritesheet } from 'pixi.js';
import { EmitterConfigV3 } from '@pixi/particle-emitter';
/**
 * 获取 emitter config behaviors 中的配置
 */
export declare function getEmitterType(config: EmitterConfigV3, type: string): import('@pixi/particle-emitter').BehaviorEntry;
/**
 * 根据给定的信息, 加载spriteSheet
 * @param img spriteSheet原图片Sprite
 * @param quantity x, y方向上小图片的个数
 * @param animationsName 该图片组成的动画的名字, 用于访问资源
 */
export declare function loadSpriteSheet(img: Sprite, quantity: {
    x: number;
    y: number;
}, animationsName: string): Promise<Spritesheet>;
/**
 * 把黑白png图片的黑色转为透明度
 * https://blog.csdn.net/jdk137/article/details/106216318
 * @param img Sprite
 * @returns
 */
export declare function sprite2TransParent(img: Sprite): Sprite;
