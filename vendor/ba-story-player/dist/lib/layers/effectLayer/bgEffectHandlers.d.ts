import { BGEffectHandlerFunction, BGEffectHandlerOptions } from '../../types/effectLayer';
import { BGEffectExcelTableItem, BGEffectType } from '../../types/excels';
/**
 * 处理函数的对应参数
 */
export declare const bgEffectHandlerOptions: BGEffectHandlerOptions;
export declare const bgEffectHandlers: Record<string, BGEffectHandlerFunction<BGEffectType>>;
/**
 * 播放对应的BGEffect
 * @param bgEffectItem
 * @returns
 */
export declare function playBGEffect(bgEffectItem: BGEffectExcelTableItem): Promise<void>;
/**
 * 移除当前的BGEffect
 */
export declare function removeBGEffect(): Promise<void>;
