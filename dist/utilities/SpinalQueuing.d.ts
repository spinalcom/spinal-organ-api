/// <reference types="node" />
import { EventEmitter } from "events";
export declare enum Events {
    FINISH = "finish",
    START = "start"
}
export declare class SpinalQueuing extends EventEmitter {
    private processed;
    private queueList;
    percent: number;
    private length;
    isProcessing: boolean;
    private debounceStart;
    constructor();
    addToQueue(obj: any): number;
    setQueue(queue: any[]): number;
    dequeue(): any;
    refresh(): void;
    getQueue(): any[];
    isEmpty(): boolean;
    private begin;
    private finish;
}
export default SpinalQueuing;
