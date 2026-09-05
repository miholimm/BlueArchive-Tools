import { EventData } from '@esotericsoftware/spine-pixi-v7';
import { PlayerConfigs, StoryUnit } from './types/common';
export declare function checkloadAssetAlias(alias: string, url: string): Promise<any>;
/**
 * 继续播放
 */
export declare function continuePlay(): void;
/**
 * 回收播放器资源, 让播放器回到初始状态
 */
export declare function dispose(): void;
/**
 * 事件发送控制对象
 */
export declare const eventEmitter: {
    /** 当前是否处于l2d播放中, 并不特指l2d某个动画 */
    l2dPlaying: boolean;
    characterDone: boolean;
    effectDone: boolean;
    titleDone: boolean;
    textDone: boolean;
    stDone: boolean;
    isStoryLogShow: boolean;
    toBeContinueDone: boolean;
    nextEpisodeDone: boolean;
    /** 当前l2d动画是否播放完成 */
    l2dAnimationDone: boolean;
    VoiceJpDone: boolean;
    readonly unitDone: boolean;
    /**
     * 注册事件
     */
    init(): void;
    /**
     * 根据当前剧情发送事件
     */
    emitEvents(): Promise<void>;
    actionByUnitType(currentStoryUnit?: StoryUnit): void;
    clearSt(): void;
    /**
     * 显示背景
     */
    showBg(currentStoryUnit?: StoryUnit): Promise<void>;
    /**
     * 显示角色
     */
    showCharacter(currentStoryUnit?: StoryUnit): void;
    /**
     * 播放声音
     */
    playAudio(currentStoryUnit?: StoryUnit): void;
    playL2d(): void;
    /**
     * 控制隐藏事件的发送
     */
    hide(): void;
    show(): void;
    /**
     * 播放特效
     */
    playEffect(): void;
    transitionIn(): Promise<void>;
    transitionOut(): Promise<void>;
    showPopup(): void;
};
/**
 * 调用各层的初始化函数
 */
export declare function init(elementID: string, props: PlayerConfigs, endCallback: () => void, errorCallback: () => void): Promise<void>;
/**
 * 资源加载处理对象
 */
export declare const resourcesLoader: {
    loadTaskList: Promise<unknown>[];
    loadedList: string[];
    /**
     * 初始化, 预先加载表资源供翻译层使用
     */
    init(): Promise<void>;
    /**
     * 添加所有资源, 有些pixi loader不能处理的资源则会调用资源处理函数, 故会返回promise
     */
    addLoadResources(): void;
    /**
     * 加载资源并在加载完成后执行callback
     * @param callback
     */
    load(callback: () => void): void;
    /**
     * 检查资源是否存在或已加载, 没有则添加
     * @param resources 检查是否存在的资源, url可为对象属性或本身
     * @param key 当resoureces为对象时指定的url属性
     */
    checkAndAdd(resources: object | string | undefined, key?: string): void;
    /**
     * 添加人物情绪相关资源(图片和声音)
     */
    addEmotionResources(): Promise<void>;
    /**
     * 添加FX相关资源
     */
    addFXResources(): Promise<void>;
    /**
     * 添加l2d语音
     */
    loadL2dVoice(audioEvents: EventData[]): void;
    /**
     * 添加其他特效音
     */
    addOtherSounds(): void;
    /**
     * 添加bgEffect相关图像资源
     */
    addBGEffectImgs(): void;
    /**
     * 加载原始数据资源
     */
    loadExcels(): Promise<void>;
};
/**
 * 暂停播放
 */
export declare function stop(): void;
/**
 * 处理故事进度对象
 */
export declare const storyHandler: {
    currentStoryIndex: number;
    endCallback: () => void;
    errorCallback: () => void;
    unitPlaying: boolean;
    auto: boolean;
    isEnd: boolean;
    isSkip: boolean;
    readonly currentStoryUnit: StoryUnit;
    readonly nextStoryUnit: StoryUnit;
    /**
     * 通过下标递增更新当前故事节点
     */
    storyIndexIncrement(): true | undefined;
    next(): void;
    /**
     * 根据选项控制故事节点
     * @param option
     * @returns
     */
    select(option: number): boolean | undefined;
    /**
     * 播放故事直到对话框或选项出现, auto模式下只在选项时停下
     */
    storyPlay(): Promise<void>;
    /**
     * 检查故事是否已经结束, 结束则调用结束函数结束播放
     */
    checkEnd(): boolean;
    /**
     * 结束播放
     */
    end(): void;
    /**
     * 开启auto模式
     */
    startAuto(): void;
    /**
     * 停止auto模式
     */
    stopAuto(): void;
};
