import * as bacnet from "bacstack";
import { SpinalNodeRef } from "spinal-env-viewer-graph-service";
import { NetworkService } from "spinal-model-bmsnetwork";
import { IDevice, IObjectId, IReadPropertyMultiple, IRequestArray, IReadProperty } from "../Interfaces";
export default class BacnetUtilities {
    constructor();
    static readPropertyMultiple(address: string, requestArray: IRequestArray | IRequestArray[], argClient?: bacnet): Promise<IReadPropertyMultiple>;
    static readProperty(address: string, objectId: IObjectId, propertyId: number | string, argClient?: bacnet, clientOptions?: any): Promise<IReadProperty>;
    static _getDeviceObjectList(device: IDevice, SENSOR_TYPES: Array<number>, argClient?: bacnet): Promise<Array<IObjectId>>;
    static getItemListByFragment(device: IDevice, objectId: IObjectId, argClient?: bacnet): Promise<unknown>;
    static _getObjectDetail(device: IDevice, objects: Array<IObjectId>, argClient?: any): Promise<Array<{
        [key: string]: string | boolean | number;
    }>>;
    static _getObjectDetailWithReadPropertyMultiple(device: IDevice, objects: Array<IObjectId>, argClient?: any): Promise<Array<any>>;
    static _getObjectDetailWithReadProperty(device: IDevice, objectId: IObjectId, argClient?: any): Promise<any>;
    static _getChildrenNewValue(device: IDevice, children: Array<IObjectId>, argClient?: bacnet): Promise<Array<{
        id: string | number;
        type: string | number;
        currentValue: any;
    }>>;
    private static getChildrenNewValueWithReadPropertyMultiple;
    private static getChildrenNewValueWithReadProperty;
    static createEndpointsInGroup(networkService: NetworkService, deviceId: string, groupName: string, endpointArray: any): Promise<void>;
    static _createEndpointsGroup(networkService: NetworkService, deviceId: string, groupName: string): Promise<any>;
    static _createEndpointByArray(networkService: NetworkService, groupId: string, endpointArray: any): Promise<void>;
    static _createEndpoint(networkService: NetworkService, groupId: string, endpointObj: any): Promise<any>;
    static _itemExistInChild(parentId: string, relationName: string, childNetworkId: string | number): Promise<SpinalNodeRef>;
    static _getPropertyValue(address: string, objectId: IObjectId, propertyId: number | string, argClient?: bacnet): Promise<any>;
    static _formatProperty(object: any): any;
    static _getObjValue(value: any): any;
    static _formatCurrentValue(value: any, type: number | string): any;
    static _getPropertyNameByCode(type: number): any;
    static _getObjectTypeByCode(typeCode: number | string): any;
    static _getUnitsByCode(typeCode: number): string;
    private static getChildrenObj;
}
export { BacnetUtilities };
