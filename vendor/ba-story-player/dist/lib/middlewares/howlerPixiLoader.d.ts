import { Howl } from 'howler';
import { LoaderParserPriority, ExtensionType } from 'pixi.js';
export declare const HowlerLoader: {
    extension: {
        name: string;
        priority: LoaderParserPriority;
        type: ExtensionType;
    };
    test(url: string): boolean;
    load(url: string): Promise<unknown>;
    unload(asset: Howl): void;
};
