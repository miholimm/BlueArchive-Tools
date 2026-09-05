import { Actions, Getters, PrivateStates, PublicStates } from '../types/store';
/**
 * 返回可修改的privateState, 仅本体在初始化时可调用
 */
export declare const initPrivateState: () => PrivateStates;
/**
 * 资源调用接口
 * @returns 资源调用工具对象
 */
export declare const usePlayerStore: () => PublicStates & Getters & Readonly<PrivateStates> & Actions;
