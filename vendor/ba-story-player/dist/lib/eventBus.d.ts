import { Events } from './types/events';
declare const eventBus: import('mitt').Emitter<Events>;
export default eventBus;
