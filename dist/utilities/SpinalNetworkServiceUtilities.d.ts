import { SpinalBacnetValueModel, SpinalDisoverModel, SpinalApiDiscoverModel, SpinalListenerModel } from "spinal-model-bacnet";
import { IDataMonitor } from "../Interfaces/IDataMonitor";
import { IDataDiscover } from "../Interfaces/IDataDiscover";
import { IDataBacnetValue } from "../Interfaces/IDataBacnetValue";
export declare class SpinalNetworkServiceUtilities {
    constructor();
    static initSpinalDiscoverNetwork(spinalModel: SpinalDisoverModel | SpinalApiDiscoverModel): Promise<IDataDiscover>;
    static initSpinalBacnetValueModel(spinalModel: SpinalBacnetValueModel): Promise<IDataBacnetValue>;
    static initSpinalListenerModel(spinalModel: SpinalListenerModel): Promise<IDataMonitor>;
    private static _getSpinalDiscoverModel;
    private static _getOrCreateNetworkNode;
    private static loadPtrValue;
}
