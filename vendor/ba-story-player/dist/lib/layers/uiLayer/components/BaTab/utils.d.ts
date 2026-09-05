import { Ref } from 'vue';
export declare const CurrentActivePanel: Ref<Map<string, Ref<string, string>> & Omit<Map<string, Ref<string, string>>, keyof Map<any, any>>, Map<string, Ref<string, string>> | (Map<string, Ref<string, string>> & Omit<Map<string, Ref<string, string>>, keyof Map<any, any>>)>;
export declare function useProgress(uuid?: string): {
    _ref: Ref<string, string>;
    uuid: string;
};
