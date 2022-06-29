import { SpinalListenerModel } from "spinal-model-bacnet";
import NetworkService from "spinal-model-bmsnetwork";
import { MinPriorityQueue } from "@datastructures-js/priority-queue";

import { SpinalNetworkServiceUtilities } from "../utilities/SpinalNetworkServiceUtilities";
import { SpinalQueuing } from "../utilities/SpinalQueuing";
import { SpinalDevice } from "./SpinalDevice";
import * as lodash from "lodash";
import { SpinalNode } from "spinal-model-graph";

import { IDataMonitor } from "../Interfaces/IDataMonitor";

class SpinalMonitoring {

   private queue: SpinalQueuing = new SpinalQueuing();
   // private priorityQueue: MinPriorityQueue<{ interval: number; functions: { id: string; func: Function }[] }> = new MinPriorityQueue();
   private priorityQueue: MinPriorityQueue<{ interval: number; }> = new MinPriorityQueue();
   private isProcessing: boolean = false;
   private intervalTimesMap: Map<number, any> = new Map();
   private initializedMap: Map<string, boolean> = new Map();
   private binded = []
   private devices: Array<string> = [];


   constructor() { }

   public async addToMonitoringList(spinalListenerModel: SpinalListenerModel): Promise<void> {
      this.queue.addToQueue(spinalListenerModel);
   }

   init() {
      this.queue.on("start", () => {
         console.log("start initialisation...");

         this.startDeviceInitialisation();
      })
   }


   public async startDeviceInitialisation() {
      const list = this.queue.getQueue();
      this.queue.refresh();



      const promises = list.map(el => SpinalNetworkServiceUtilities.initSpinalListenerModel(el));

      const devices = lodash.flattenDeep(await Promise.all(promises)).filter(el => typeof el !== "undefined");

      await this._createMaps(devices);
      // await this.addToQueue(filtered);

      if (!this.isProcessing) {
         this.isProcessing = true;
         this.startMonitoring()
      }
   }

   public async startMonitoring() {
      console.log("start monitoring...");

      let p = true;
      while (p) {
         if (this.priorityQueue.isEmpty()) {
            // console.log("priority queue is empty");

            await this.waitFct(100);
            continue;
         }

         const { priority, element } = this.priorityQueue.dequeue();
         const functions = this.intervalTimesMap.get(element.interval);

         if (functions && functions.length > 0) {
            await this.execFunc(functions, element.interval, priority);
         }


      }
   }

   private async _createMaps(devices: Array<IDataMonitor>) {
      const devices_copy = Object.assign([], devices);

      while (devices_copy.length > 0) {
         const { id, spinalModel, spinalDevice, networkService, network } = devices_copy.shift();
         const listen = spinalModel.listen.get();

         if (!listen) {
            this.removeToMaps(id);
            console.log(spinalDevice.device.name, "is stopped");

            continue;
         }
         const monitors = spinalModel.monitor.getMonitoringData();
         const intervals = await this.getValidIntervals(spinalDevice, networkService, spinalModel, network, monitors);
         for (const { interval, func } of intervals) {
            this._addToMap(id, interval, func);
         }

         if (this.binded.indexOf(id) === -1) {
            spinalModel.listen.bind(() => {
               console.log("listen changed");

               this.addToMonitoringList(spinalModel);
            })
         }

      }



      // const promises = devices.map(async ({ id, spinalModel, spinalDevice, networkService, network }) => {
      //    const listen = spinalModel.listen.get();
      //    console.log("listen", listen);

      //    if (!listen) {
      //       this.removeToMaps(id);
      //       return;
      //    }
      //    const monitors = spinalModel.monitor.getMonitoringData();
      //    const intervals = await this.getValidIntervals(spinalDevice, networkService, spinalModel, network, monitors);
      //    // console.log(intervals);
      // })
   }

   private _addToMap(id: string, interval: number, func: Function) {
      let value = this.intervalTimesMap.get(interval);
      if (typeof value === "undefined") {
         value = [];
      }

      value.push({ id, func })
      this.intervalTimesMap.set(interval, value);
      this._addIntervalToPriorityQueue(interval);
   }

   private removeToMaps(deviceId: string) {
      this.intervalTimesMap.forEach((value, key) => {
         this.intervalTimesMap.set(key, value.filter(el => el.id !== deviceId));
      })
   }

   private _addIntervalToPriorityQueue(interval: number) {
      const arr = this.priorityQueue.toArray();
      const found = arr.find(({ element }) => {
         return element.interval === interval;
      })

      if (typeof found === "undefined") {
         this.priorityQueue.enqueue({ interval }, Date.now() + interval);
      }
   }

   // private async _createMaps(devices: Array<IDataMonitor>) {
   //    for (const { id, spinalModel, spinalDevice, networkService, network } of devices) {
   //       // spinalModel.listen.bind(async () => {
   //       const value = spinalModel.listen.get();

   //       if (!value) {
   //          this.removeToMaps(id);
   //          return;
   //       }

   //       const monitors = spinalModel.monitor.getMonitoringData();
   //       const promises = monitors.map(async ({ interval, children }) => {
   //          if (isNaN(interval) || interval <= 0 || children.length <= 0) return;

   //          await this.createDataIfNotExist(spinalDevice, children, networkService, network, interval);
   //          const func = async () => this.funcToExecute(spinalModel, spinalDevice, children, networkService, network);

   //          let value = this.intervalTimesMap.get(interval);
   //          if (typeof value === "undefined") {
   //             value = [];
   //          }

   //          value.push({ id, func })
   //          this.intervalTimesMap.set(interval, value);
   //          const arr = this.priorityQueue.toArray();

   //          const found = arr.find(({ element }) => {
   //             return element.interval === interval;
   //          })

   //          if (typeof found === "undefined") {
   //             this.priorityQueue.enqueue({ interval }, Date.now() + interval);
   //          }

   //          return;
   //       })

   //       return Promise.all(promises);
   //       // })
   //    }

   // }



   private async execFunc(functions: { id: string; func: Function }[], interval: number, date?: number) {

      if (date && Date.now() < date) {
         console.log("wait");
         await this.waitFct(date - Date.now());
      }
      try {
         const deep_functions = [...functions]

         while (deep_functions.length > 0) {
            try {
               const { func } = deep_functions.shift();

               if (typeof func === "function") {
                  await func();
               }
            } catch (error) {
               console.error(error);

            }
         }
         this.priorityQueue.enqueue({ interval }, Date.now() + interval);
      } catch (error) {
         console.error(error);

         this.priorityQueue.enqueue({ interval }, Date.now() + interval);
      }

   }

   private async createDataIfNotExist(spinalDevice: SpinalDevice, children: Array<any>, networkService: NetworkService, interval: number) {
      try {
         const id = `${spinalDevice.device.deviceId}_${interval}`;
         let init = this.initializedMap.get(id);

         if (!init) {
            // console.log("initialisation");
            this.initializedMap.set(id, true);
            await spinalDevice.checkAndCreateIfNotExist(networkService, children);
         }
      } catch (error) {
         console.error(error)
      }

   }

   private async funcToExecute(spinalModel: SpinalListenerModel, spinalDevice: SpinalDevice, children: Array<any>, networkService: NetworkService, network: SpinalNode<any>) {
      if (spinalModel.listen.get() && children?.length > 0) {
         await spinalDevice.updateEndpoints(networkService, network, children);
      }
   }

   private async getValidIntervals(spinalDevice: SpinalDevice, networkService: NetworkService, spinalModel: SpinalListenerModel, network: SpinalNode<any>, monitors: { interval: number; children: [] }[]) {
      const monitors_copy = Object.assign([], monitors);
      const res = []
      while (monitors_copy.length > 0) {
         const { interval, children } = monitors_copy.shift();
         if (isNaN(interval) || interval <= 0 || children.length <= 0) continue;
         //await this.createDataIfNotExist(spinalDevice, children, networkService, interval); !!!REMOVE
         const func = async () => this.funcToExecute(spinalModel, spinalDevice, children, networkService, network);
         res.push({
            interval,
            children,
            func
         })
      }
      return res;
   }

   private waitFct(nb: number): Promise<void> {
      return new Promise((resolve) => {
         setTimeout(
            () => {
               resolve();
            },
            nb >= 0 ? nb : 0);
      });
   }

}

const spinalMonitoring = new SpinalMonitoring();
spinalMonitoring.init();

export default spinalMonitoring;
export {
   spinalMonitoring
}
