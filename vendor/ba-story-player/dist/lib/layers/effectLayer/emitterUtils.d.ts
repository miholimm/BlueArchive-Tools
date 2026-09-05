import { Container } from 'pixi.js';
import { EffectRemoveFunction } from '../../types/effectLayer';
import { Emitter, EmitterConfigV2, EmitterConfigV3 } from '@pixi/particle-emitter';
/**
 * 获取emitter config
 * @param filename 文件名, 不需要加.json后缀
 * @returns
 */
export declare function emitterConfigs(filename: string): EmitterConfigV2 | EmitterConfigV3;
/**
 * 给emitter用的container
 */
export declare const emitterContainer: Container<import('pixi.js').DisplayObject>;
/**
 * emitter工具函数, 会自动启动emitter并返回一个终止函数
 * @param emitter
 * @param stopCallback 终止函数中调用的函数
 * @returns 终止函数, 功能是停止当前emitter并回收
 */
export declare function emitterStarter(emitter: Emitter, stopCallback?: () => void): EffectRemoveFunction;
