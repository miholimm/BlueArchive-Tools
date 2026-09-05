import { ShowOption } from '../../../types/events';
type __VLS_Props = {
    selection: ShowOption[];
};
declare const _default: import('vue').DefineComponent<__VLS_Props, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {} & {
    select: (value: number) => any;
}, string, import('vue').PublicProps, Readonly<__VLS_Props> & Readonly<{
    onSelect?: ((value: number) => any) | undefined;
}>, {
    selection: ShowOption[];
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, false, {
    selectorContainerElement: HTMLDivElement;
    selectorElement: HTMLDivElement;
}, HTMLDivElement>;
export default _default;
