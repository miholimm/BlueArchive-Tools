import { Ref } from 'vue';
type Volume = {
    masterVolume: number;
    bgmVolume: number;
    sfxVolume: number;
    voiceVolume: number;
};
type PlayerSetting = {
    typingSpeed: number;
};
type RawUiState = {
    autoMode: boolean;
    tabActivated: boolean;
    volume: Volume;
    playing: PlayerSetting;
};
type ToRefState<T> = {
    [key in keyof T]: Ref<T[key]>;
};
export type UiState = ToRefState<RawUiState>;
export {};
