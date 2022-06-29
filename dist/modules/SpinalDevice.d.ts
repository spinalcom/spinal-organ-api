/// <reference types="node" />
import { NetworkService } from "spinal-model-bmsnetwork";
import { EventEmitter } from "events";
import { SpinalNode, SpinalNodeRef } from "spinal-env-viewer-graph-service";
import { SpinalBacnetValueModel } from "spinal-model-bacnet";
import { IDevice, IApiDevice } from "../Interfaces";
export declare class SpinalDevice extends EventEmitter {
    device: IDevice;
    private info;
    private client;
    constructor(device: IDevice, client?: any, networkService?: NetworkService);
    init(): Promise<boolean | void>;
    createStructureNodes(networkService: NetworkService, node: SpinalNodeRef, parentId: string): Promise<any>;
    createDeviceItemList(networkService: NetworkService, node: SpinalNodeRef, spinalBacnetValueModel: SpinalBacnetValueModel): Promise<any>;
    checkAndCreateIfNotExist(networkService: NetworkService, objectIds: Array<{
        instance: number;
        type: string;
    }>): Promise<void[]>;
    updateEndpoints(networkService: NetworkService, networkNode: SpinalNode<any>, children: Array<{
        instance: number;
        type: number;
    }>): Promise<void>;
    private _createDevice;
    private _getDeviceInfo;
    private _groupByType;
    private _getDataValue;
}
export declare class SpinalApiDevice extends EventEmitter {
    device: IApiDevice;
    private info;
    private site;
    private options;
    constructor(device: IApiDevice, site?: any, networkService?: NetworkService);
    init(): Promise<boolean | void>;
    createStructureNodes(networkService: NetworkService, node: SpinalNodeRef, parentId: string): Promise<any>;
    createDeviceItemList(networkService: NetworkService, node: SpinalNodeRef, spinalBacnetValueModel: SpinalBacnetValueModel): Promise<any>;
    checkAndCreateIfNotExist(networkService: NetworkService, objectIds: Array<any>): Promise<void[]>;
    updateEndpoints(networkService: NetworkService, networkNode: SpinalNode<any>, children: Array<{
        instance: number;
        type: number;
    }>): Promise<void>;
    private _getDeviceObjectList;
    private _getObjectDetail;
    private _fiterObjectList;
    private _createDevice;
    private _getDeviceInfo;
    private _groupByType;
    private _getDataValue;
}
