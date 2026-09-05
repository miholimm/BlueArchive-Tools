import { Spine } from '@esotericsoftware/spine-pixi-v7';
import { CharacterEffectPlayer, PositionOffset } from '../../types/characterLayer';
declare const CharacterEffectPlayerInstance: CharacterEffectPlayer;
/**
 * 角色position对应的覆盖关系
 */
export declare const POS_INDEX_MAP: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
};
/**
 * 角色position x轴值相对于中心的偏移量, 单位是播放器宽度
 */
export declare const POS_X_CNETER_OFFSET: {
    "1": number;
    "2": number;
    "3": number;
    "4": number;
    "5": number;
};
/**
 * 根据position: 0~5 计算出角色的原点位置
 * @param character 要显示的角色
 * @param position 角色所在位置
 */
export declare function calcSpineStagePosition(character: Spine, position: number): PositionOffset;
/**
 * 以px计算的移动速度
 */
export declare function moveSpeedPx(): number;
export default CharacterEffectPlayerInstance;
