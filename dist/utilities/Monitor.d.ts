import { SpinalNode } from "spinal-env-viewer-graph-service";
import { SpinalListenerModel } from "spinal-model-bacnet";
import { NetworkService } from "spinal-model-bmsnetwork";
import { SpinalDevice } from "../modules/SpinalDevice";
export default class Monitor {
    private monitorModel;
    private intervalId;
    private monitoringProcess;
    private intervalProcess;
    private timeSeriesProcess;
    private networkService;
    private spinalDevice;
    private spinalModel;
    private spinalNetwork;
    constructor(model: any, networkService: NetworkService, spinalDevice: SpinalDevice, spinalModel: SpinalListenerModel, spinalNetwork: SpinalNode<any>);
    start(): void;
    stop(): void;
}
export { Monitor };
