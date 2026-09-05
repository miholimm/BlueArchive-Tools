import { ResourcesTypes } from './types/resources';
import { BGEffectExcelTableItem } from './types/excels';
import { Spine } from '@esotericsoftware/spine-pixi-v7';
/**
 * 字面意思, 深拷贝json
 */
export declare function deepCopyObject<T>(object: T): T;
/**
 * 获取其他特效音资源, 用于本体资源加载
 * @returns
 */
export declare function getOtherSoundUrls(): string[];
/**
 * 根据资源类型和参数获取资源地址, 可根据服务器实际情况修改
 * @param type
 * @param arg
 * @returns
 */
export declare function getResourcesUrl(type: ResourcesTypes, arg: string): string;
/**
 * 设置数据站点
 * @param url
 */
export declare function setDataUrl(url: string): void;
/**
 * 设置ogg类型音频的替代音频类型
 */
export declare function setOggAudioType(audioType: "mp3"): void;
export declare function setSuperSampling(type: "2" | "4" | "" | boolean): void;
export declare function wait(milliseconds: number): Promise<unknown>;
export declare function getEffectArray(effect: BGEffectExcelTableItem): string[];
export declare function hasAnimation(instance: Spine, animationName: string): boolean;
