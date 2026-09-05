export declare function disposeUiState(): void;
export declare function useUiState(): {
    autoMode: import('vue').Ref<boolean, boolean>;
    tabActivated: import('vue').Ref<boolean, boolean>;
    volume: import('vue').Ref<{
        masterVolume: number;
        bgmVolume: number;
        sfxVolume: number;
        voiceVolume: number;
    }, {
        masterVolume: number;
        bgmVolume: number;
        sfxVolume: number;
        voiceVolume: number;
    }>;
    playing: import('vue').Ref<{
        typingSpeed: number;
    }, {
        typingSpeed: number;
    }>;
};
