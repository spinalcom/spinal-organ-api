import { SpinalNode } from "spinal-env-viewer-graph-service";
import { SpinalListenerModel } from "spinal-model-bacnet";
import { NetworkService } from "spinal-model-bmsnetwork";
import { SpinalDevice } from "../modules/SpinalDevice";

export default class Monitor {
   private monitorModel: any;
   private intervalId: any;
   private monitoringProcess: any;
   private intervalProcess: any;
   private timeSeriesProcess: any;

   private networkService: NetworkService;
   private spinalDevice: SpinalDevice;
   private spinalModel: SpinalListenerModel;
   private spinalNetwork: SpinalNode<any>;

   // constructor(model: any, callback: any) {
   constructor(model: any, networkService: NetworkService, spinalDevice: SpinalDevice, spinalModel: SpinalListenerModel, spinalNetwork: SpinalNode<any>) {
      this.monitorModel = model;
      this.networkService = networkService;
      this.spinalDevice = spinalDevice;
      this.spinalModel = spinalModel;
      this.spinalNetwork = spinalNetwork;
   }

   start() {
      if (isNaN(this.monitorModel.interval.get())) {
         // console.log("isNaN")
         this.stop();
         return
      };

      this.timeSeriesProcess = this.spinalModel.saveTimeSeries?.bind(() => {
         console.log("timeSeries change", this.spinalModel.saveTimeSeries?.get());

         this.networkService.useTimeseries = this.spinalModel.saveTimeSeries?.get() || false;
      })

      this.monitoringProcess = this.monitorModel.monitoring.bind(() => {
         if (!this.monitorModel.monitoring.get()) {
            // console.log("!this.monitorModel.monitoring.get()")
            this.stop();
            return
         };

         this.intervalProcess = this.monitorModel.interval.bind(() => {
            // console.log("inside interval bind")
            clearInterval(this.intervalId);
            this.intervalId = setInterval(() => {
               const children = this.monitorModel.children.get();
               this.spinalDevice.updateEndpoints(this.networkService, this.spinalNetwork, children);
            }, this.monitorModel.interval.get())
         })

      })
   }

   stop() {
      // console.log("stop")
      clearInterval(this.intervalId);
      this.monitorModel.monitoring.unbind(this.monitoringProcess);
      this.monitorModel.interval.unbind(this.intervalProcess);
      this.spinalModel.saveTimeSeries?.unbind(this.timeSeriesProcess);
   }
}

export { Monitor }