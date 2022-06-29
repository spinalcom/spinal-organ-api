import { NetworkService } from "spinal-model-bmsnetwork";
import { SpinalNode } from "spinal-env-viewer-graph-service";

export interface IDataBacnetValue {
   networkService: NetworkService;
   network?: any;
   device: any;
   organ: any;
   node: SpinalNode<any>;
}
