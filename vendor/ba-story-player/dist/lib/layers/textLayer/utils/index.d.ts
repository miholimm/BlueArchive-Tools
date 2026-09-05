import { PartialCSS } from '../types';
import { TextEffect } from '../../../types/common';
import { StText } from '../../../types/events';
export * from './typingEmitter';
export declare function collapseWhiteSpace(value: string): string;
export declare function isElement(e: unknown): e is Element;
export declare function parseStEffectToCss(st: StText): PartialCSS;
export declare function parseTextEffectToCss(effects: TextEffect[]): PartialCSS;
