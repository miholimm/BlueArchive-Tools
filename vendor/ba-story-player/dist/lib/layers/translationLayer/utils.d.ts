import { Speaker, StoryRawUnit, StoryUnit, Text, TextEffect, TextEffectName } from '../../types/common';
import { PlayAudio, ShowTitleOption } from '../../types/events';
import { CharacterNameExcelTableItem } from '../../types/excels';
import { Language } from '../../types/store';
export declare function buildNxAST(rawText: string): NxAST;
export declare function buildStoryIndexStackRecord(source: StoryUnit[]): StoryUnit[];
/**
 * 检查当前单元是否有背景覆盖变换, 有则删除该变换并返回变换的参数
 * @param unit
 */
export declare function checkBgOverlap(unit: StoryUnit): number | undefined;
/**
 * 在大小写不敏感的情况下比较字符串
 */
export declare function compareCaseInsensive(s1: string, s2: string): boolean;
/**
 * 从原始文字生成Text[], 即带特效参数字符串
 * @param rawStoryUnit
 * @param stm 是否为stm类型文字
 * @returns
 */
export declare function generateText(rawStoryUnit: StoryRawUnit): Text[];
export declare function generateTitleInfo(rawStoryUnit: StoryRawUnit, language: Language): ShowTitleOption;
export declare function getBgm(BGMId: number): PlayAudio["bgm"] | undefined;
/**
 * 获取角色在unit的characters里的index, 当不存在时会自动往unit的character里加入该角色
 */
export declare function getCharacterIndex(unit: StoryUnit, initPosition: number, result: StoryUnit[], rawIndex: number): number;
/**
 * 根据韩文名获取名字和头像
 * @param krName
 * @returns 包含speaker,avatar的对象
 */
export declare function getCharacterInfo(krName: string): {
    speaker: Speaker;
    avatarUrl: string;
} | undefined;
/**
 * 根据角色韩文名获取CharacterName
 * @param krName
 */
export declare function getCharacterName(krName: string): number;
export declare function getEmotionName(rawName: string): string | undefined;
export declare function getL2DUrlAndName(BGFileName: string): {
    url: string;
    name: string;
};
export declare function getSoundUrl(Sound: string): string | undefined;
/**
 * 在CharacterNameExcelTableItem中获取到speaker信息
 */
export declare function getSpeaker(characterInfo: CharacterNameExcelTableItem): Speaker;
/**
 * 选择文字, 当没有当前语言文字时返回日文
 */
export declare function getText(rawStoryUnit: StoryRawUnit, language: Language): string;
type NxTag = TextEffectName | "root" | "text";
type NxAST = {
    tag: NxTag;
    text?: string;
    children: NxAST[];
    attr?: TextEffect["value"];
    parent?: NxAST;
};
export declare function getVoiceJPUrl(VoiceJp: string): string | undefined;
/**
 * 将嵌套tag结构分割
 *
 * [FF6666]……我々は望む、七つの[-][ruby=なげ][FF6666]嘆[-][/ruby][FF6666]きを。[-]
 *
 * [FF6666]……我々は望む、七つの[-],[ruby=なげ][FF6666]嘆[-][/ruby],[FF6666]きを。[-]
 *
 * [b]……我々は望む、七つの嘆[FF6666]きを。[-][/b]
 *
 * [b]……我々は望む、七つの嘆[/b], [b][FF6666]きを。[-][/b]
 * @param rawText 原始结构
 */
export declare function parseNxMagicTag(rawText: string): Text[];
export {};
