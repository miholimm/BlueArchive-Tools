import { Language, StorySummary } from '../../types/store';
type __VLS_Props = {
    storySummary: StorySummary;
    height: number;
    width: number;
    fullScreen: boolean;
    language: Language;
};
declare const _default: import('vue').DefineComponent<__VLS_Props, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {
    "update:fullScreen": (...args: any[]) => void;
}, string, import('vue').PublicProps, Readonly<__VLS_Props> & Readonly<{
    "onUpdate:fullScreen"?: ((...args: any[]) => any) | undefined;
}>, {}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {
    rightTop: HTMLDivElement;
}, HTMLDivElement>;
export default _default;
