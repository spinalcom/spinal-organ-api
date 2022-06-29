/// <reference types="node" />
import { EventEmitter } from "events";
import { SpinalDisoverModel, SpinalApiDiscoverModel } from 'spinal-model-bacnet';
declare class Discover extends EventEmitter {
    private _discoverQueue;
    private _isProcess;
    constructor();
    private listenEvent;
    addToQueue(model: SpinalDisoverModel | SpinalApiDiscoverModel): void;
    private _discoverNext;
}
export declare const discover: Discover;
export declare class SpinalDiscover {
    private bindSateProcess;
    private client;
    private CONNECTION_TIME_OUT;
    private devices;
    private discoverModel;
    constructor(model: any);
    init(model: any): void;
    private bindState;
    private discover;
    private getDevicesQueue;
    private createSpinalDevice;
    private addDeviceFound;
    private createNodes;
    private getDevices;
}
export declare class SpinalApiDiscover {
    private bindSateProcess;
    private protocol;
    private ip_address;
    private port;
    private path;
    private site;
    private CONNECTION_TIME_OUT;
    private devices;
    private discoverModel;
    private options;
    constructor(model: any);
    init(model: any): void;
    private bindState;
    private sendRequest;
    private discover;
    private getDevicesQueue;
    private createSpinalDevice;
    private addDeviceFound;
    private createNodes;
    private getDevices;
}
export {};
