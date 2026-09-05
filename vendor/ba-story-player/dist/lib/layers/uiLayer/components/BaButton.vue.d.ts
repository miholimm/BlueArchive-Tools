import { PropType } from 'vue';
declare function __VLS_template(): {
    attrs: Partial<{}>;
    slots: {
        default?(_: {}): any;
    };
    refs: {
        button: HTMLButtonElement;
    };
    rootEl: HTMLButtonElement;
};
type __VLS_TemplateResult = ReturnType<typeof __VLS_template>;
declare const __VLS_component: import('vue').DefineComponent<import('vue').ExtractPropTypes<{
    bgcolor: StringConstructor;
    size: {
        type: PropType<"large" | "middle" | "small">;
        default: string;
    };
    disabled: BooleanConstructor;
}>, {}, {}, {}, {}, import('vue').ComponentOptionsMixin, import('vue').ComponentOptionsMixin, {} & {
    click: (event: Event) => any;
}, string, import('vue').PublicProps, Readonly<import('vue').ExtractPropTypes<{
    bgcolor: StringConstructor;
    size: {
        type: PropType<"large" | "middle" | "small">;
        default: string;
    };
    disabled: BooleanConstructor;
}>> & Readonly<{
    onClick?: ((event: Event) => any) | undefined;
}>, {
    size: "small" | "middle" | "large";
    disabled: boolean;
}, {}, {}, {}, string, import('vue').ComponentProvideOptions, true, {
    button: HTMLButtonElement;
}, HTMLButtonElement>;
declare const _default: __VLS_WithTemplateSlots<typeof __VLS_component, __VLS_TemplateResult["slots"]>;
export default _default;
type __VLS_WithTemplateSlots<T, S> = T & {
    new (): {
        $slots: S;
    };
};
