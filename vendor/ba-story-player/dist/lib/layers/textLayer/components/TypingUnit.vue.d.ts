import { Text } from '../../../types/common';
type IProp = {
    index: string;
    text: Text;
    speed?: number;
    instant?: boolean;
    title?: boolean;
    st?: boolean;
};
declare const _default: import('vue').DefineComponent<IProp, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {} & {
    unitClick: () => any;
}, string, import('vue').PublicProps, Readonly<IProp> & Readonly<{
    onUnitClick?: (() => any) | undefined;
}>, {
    title: boolean;
    text: Text;
    st: boolean;
    instant: boolean;
    speed: number;
    index: string;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {
    TypingContainer: HTMLSpanElement;
    TypingTextContainer: HTMLSpanElement;
    TooltipContainer: HTMLDivElement;
    TooltipInner: HTMLDivElement;
}, any>;
export default _default;
