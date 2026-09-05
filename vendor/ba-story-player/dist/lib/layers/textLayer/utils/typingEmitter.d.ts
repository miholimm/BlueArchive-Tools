import { BaseTypingEvent } from '../types';
type BaseEvent = {
    [key in BaseTypingEvent]: string | undefined;
};
declare const TypingEmitter: import('mitt').Emitter<BaseEvent>;
export default TypingEmitter;
