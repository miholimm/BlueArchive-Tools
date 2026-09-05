import { Spine } from '@esotericsoftware/spine-pixi-v7';
import { CharacterLayer } from '../../types/characterLayer';
export declare const CharacterLayerInstance: CharacterLayer;
/**
 * 角色初始的pivot相对与长宽的比例, 当前值代表左上角
 */
export declare const Character_Initial_Pivot_Proportion: {
    x: number;
    y: number;
};
export declare function calcCharacterYAndScale(spine: Spine): {
    scale: number;
    y: number;
};
export declare function characterInit(): boolean;
/**
 * 获取显示区域的大小
 * @return screenWidth 容器的宽 screenHeight 容器的高
 */
export declare function getStageSize(): {
    screenWidth: number;
    screenHeight: number;
};
/**
 * 获取用于计算图片缩放比例的标准宽度
 */
export declare function getStandardWidth(): number;
