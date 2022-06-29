import { NetworkService } from "spinal-model-bmsnetwork";
import { SpinalBacnetValueModel, SpinalDisoverModel, SpinalApiDiscoverModel, SpinalListenerModel } from "spinal-model-bacnet";
import { SpinalGraph, SpinalGraphService } from "spinal-env-viewer-graph-service";
import { SpinalDevice } from "../modules/SpinalDevice";
import { IDataMonitor } from "../Interfaces/IDataMonitor";
import { IDataDiscover } from "../Interfaces/IDataDiscover";
import { IDataBacnetValue } from "../Interfaces/IDataBacnetValue";

export class SpinalNetworkServiceUtilities {
   constructor() { }

   public static async initSpinalDiscoverNetwork(spinalModel: SpinalDisoverModel|SpinalApiDiscoverModel): Promise<IDataDiscover> {
      const data = await this._getSpinalDiscoverModel(spinalModel);
      const networkService = new NetworkService(false);
      await networkService.init(data.graph, data.organ);
      return {
         networkService: networkService,
         network: await this._getOrCreateNetworkNode(spinalModel.network.get(), networkService)
      };
   }


   public static async initSpinalBacnetValueModel(spinalModel: SpinalBacnetValueModel): Promise<IDataBacnetValue> {

      const { node, context, graph, network, organ } = await (<any>spinalModel.getAllItem());


      if (node) (<any>SpinalGraphService)._addNode(node);
      if (context) (<any>SpinalGraphService)._addNode(context);
      if (graph) (<any>SpinalGraphService)._addNode(graph);
      if (network) (<any>SpinalGraphService)._addNode(network);


      const networkService: NetworkService = new NetworkService(false);
      const organNetwork = {
         contextName: context.getName().get(),
         contextType: context.getType().get(),
         networkType: network.getType().get(),
         networkName: network.getName().get()
      };

      await networkService.init(graph, organNetwork);

      const device = node.info.get();

      return {
         networkService,
         device,
         organ,
         node
      }
   }


   public static async initSpinalListenerModel(spinalModel: SpinalListenerModel): Promise<IDataMonitor> {

      try {
         const saveTimeSeries = spinalModel.saveTimeSeries?.get() || false;
         const networkService: NetworkService = new NetworkService(saveTimeSeries);

         const [graph, device, network, context, organ] = await Promise.all([
            // const [graph, device, network, context, organ, profil] = await Promise.all([
            this.loadPtrValue(spinalModel.graph),
            this.loadPtrValue(spinalModel.device),
            this.loadPtrValue(spinalModel.network),
            this.loadPtrValue(spinalModel.context),
            this.loadPtrValue(spinalModel.organ),
            // this.loadPtrValue(spinalModel.monitor.profil)
         ]);


         if (graph) (<any>SpinalGraphService)._addNode(graph);
         if (device) (<any>SpinalGraphService)._addNode(device);
         if (network) (<any>SpinalGraphService)._addNode(network);
         if (context) (<any>SpinalGraphService)._addNode(context);

         const spinalDevice: SpinalDevice = new SpinalDevice(device.info.get());

         await networkService.init(graph, {
            contextName: context.getName().get(),
            contextType: context.getType().get(),
            networkType: organ.type.get(),
            networkName: organ.name.get()
         })

         spinalModel.saveTimeSeries?.bind(() => {
            networkService.useTimeseries = spinalModel.saveTimeSeries?.get() || false;
         })

         // const monitors = spinalModel.monitor.getMonitoringData();

         return {
            id: device.info.id.get(),
            spinalModel,
            spinalDevice,
            networkService,
            network
         }
         // return monitors.map(({ interval, children }) => {

         //    return {
         //       interval,
         //       id: device.info.id.get(),
         //       children,
         //       spinalModel,
         //       spinalDevice,
         //       networkService,
         //       network
         //    }
         // })
      } catch (error) {
         return;
      }





      // return {
      //    networkService,
      //    spinalDevice,
      //    spinalModel,
      //    network,
      //    profil,
      //    monitor: 
      // }

   }


   /////////////////////////////////////////////////////////////
   ////              GET NETWORK SERVICE DATA                 //
   /////////////////////////////////////////////////////////////

   private static async _getSpinalDiscoverModel(discoverModel: SpinalDisoverModel|SpinalApiDiscoverModel): Promise<{
      graph: SpinalGraph<any>;
      organ: { contextName: string; contextType: string; networkType: string; networkName: string; }
   }> {
      const graph = await this.loadPtrValue(discoverModel.graph);

      const organ = {
         contextName: discoverModel.context.name.get(),
         contextType: discoverModel.context.type.get(),
         networkType: discoverModel.organ.type.get(),
         networkName: discoverModel.organ.name.get()
      };

      return {
         graph,
         organ
      }

   }

   private static async _getOrCreateNetworkNode(networkInfo: any, networkService: NetworkService) {
      const organId = (<any>networkService).networkId;
      const contextId = (<any>networkService).contextId;

      const children = await SpinalGraphService.getChildrenInContext(organId, contextId);

      for (const child of children) {
         if (child.name.get() === networkInfo.name) {
            return child;
         }
      }

      return networkService.createNewBmsNetwork(organId, networkInfo.type, networkInfo.name);
   }

   private static loadPtrValue(ptrModel): Promise<SpinalGraph<any>> {
      return new Promise((resolve, reject) => {
         ptrModel.load((data) => {
            resolve(data);
         });
      });

   }
}
