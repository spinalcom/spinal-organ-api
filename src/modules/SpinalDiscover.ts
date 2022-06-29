import * as bacnet from 'bacstack';
import { EventEmitter } from "events";
import { SpinalQueuing } from '../utilities/SpinalQueuing';
import { SpinalGraphService, SpinalNodeRef } from "spinal-env-viewer-graph-service";
import { SpinalBmsDevice } from "spinal-model-bmsnetwork";
import { SpinalDevice, SpinalApiDevice } from './SpinalDevice';
import { IDevice , IApiDevice} from "../Interfaces/IDevice";
import { SpinalDisoverModel, STATES, SpinalApiDiscoverModel } from 'spinal-model-bacnet';
import axios, { AxiosRequestConfig } from "axios";
import { SpinalNetworkServiceUtilities } from '../utilities/SpinalNetworkServiceUtilities';

const config = require("../../config.json5");
const {username, password} = config.clientConnector;

class Discover extends EventEmitter {
   private _discoverQueue: SpinalQueuing = new SpinalQueuing();
   private _isProcess: boolean = false;

   constructor() {
      super();
      this.listenEvent();
   }

   private listenEvent() {
      this._discoverQueue.on("start", () => {
         if (!this._isProcess) {
            this._isProcess = true;
            this._discoverNext();
         }
      })

      this.on("next", () => {
         this._discoverNext();
      })
   }

   public addToQueue(model: SpinalDisoverModel | SpinalApiDiscoverModel) {
      this._discoverQueue.addToQueue(model);
   }

   private _discoverNext() {
      if (!this._discoverQueue.isEmpty()) {
         const model = this._discoverQueue.dequeue();
         
         const spinalDiscover = new SpinalApiDiscover(model) //????????????????????????;
         let timeout = false;

         let bindSateProcess = model.state.bind(() => {
            const state = model.state.get()

            switch (state) {
               case STATES.discovered:
                  model.state.unbind(bindSateProcess);
                  if (!timeout) {
                     this.emit("next");
                  }
                  break;
               case STATES.timeout:
                  if (!timeout) {
                     this.emit("next");
                  }

                  timeout = true;

               default:
                  break;
            }
         })
      } else {
         this._isProcess = false;
      }
   }

}

export const discover = new Discover();




export class SpinalDiscover {

   private bindSateProcess: any;
   private client: bacnet;
   private CONNECTION_TIME_OUT: number;
   private devices: Map<number, SpinalDevice> = new Map();
   private discoverModel: any;

   constructor(model) {
      this.discoverModel = model;
      this.CONNECTION_TIME_OUT = model.network?.timeout?.get() || 45000;

      this.init(model)
   }

   public init(model: any) {
      this.client = new bacnet({
         broadcastAddress: model.network?.address?.get(),
         port: model.network?.port?.get() || 47808,
         adpuTimeout: 6000
      })

      this.client.on('error', (err) => {
         console.log('Error occurred: ', err);
         this.client.close();
      });

      this.bindState();
   }

   private bindState(): void {
      this.bindSateProcess = this.discoverModel.state.bind(() => {
         switch (this.discoverModel.state.get()) {
            case STATES.discovering:
               console.log("discovering");
               this.discover();
               break;
            case STATES.creating:
               this.createNodes();
            default:
               break;
         }
      })
   }

   private async discover() {
      try {
         const queue = await this.getDevicesQueue();

         let isFinish = false;

         while (!isFinish) {
            const item = queue.dequeue();

            if (typeof item !== "undefined") {
               const info = await this.createSpinalDevice(item);
               if (info) this.addDeviceFound(info);
            } else {
               console.log("isFinish");
               isFinish = true;
            }
         }

         if (this.discoverModel.devices.length !== 0) {
            console.log("discovered");
            this.discoverModel.setDiscoveredMode();

         } else {
            console.log("Timeout !");
            this.discoverModel.setTimeoutMode();

         }

      } catch (error) {
         console.log("Timeout...");
         this.discoverModel.setTimeoutMode();
      }

   }

   private getDevicesQueue(): Promise<SpinalQueuing> {
      const queue: SpinalQueuing = new SpinalQueuing();
      return new Promise((resolve, reject) => {

         // if (this.discoverModel.network?.useBroadcast?.get()) {
         //    console.log("use broadcast");
         let timeOutId;

         if (this.discoverModel.network?.useBroadcast?.get()) {
            console.log("use broadcast");

            timeOutId = setTimeout(() => {
               reject("[TIMEOUT] - Cannot establish connection with BACnet server.");
            }, this.CONNECTION_TIME_OUT);

            this.client.whoIs();
         } else {
            // ips.forEach(({ address, deviceId }) => {
            //    this.client.whoIs({ address })
            // });
            console.log("use unicast");
            const ips = this.discoverModel.network?.ips?.get() || [];
            const devices = ips.filter(({ address, deviceId }) => address && deviceId)
               .map(({ address, deviceId }) => {
                  return { address, deviceId: parseInt(deviceId) }
               })

            queue.setQueue(devices);
         }

         const res = []

         this.client.on('iAm', (device) => {
            if (typeof timeOutId !== "undefined") {
               clearTimeout(timeOutId);
            }

            console.log(device);


            const { address, deviceId } = device;
            const found = res.find(el => el.address === address && el.deviceId === deviceId);
            if (!found) {
               res.push(device);
               queue.addToQueue(device);
            }
         })

         queue.on("start", () => {
            resolve(queue)
         });

      });

   }

   private createSpinalDevice(device): Promise<IDevice | void> {

      return new Promise((resolve, reject) => {
         const spinalDevice = new SpinalDevice(device, this.client);

         spinalDevice.on("initialized", (res) => {
            this.devices.set(res.device.deviceId, res);
            resolve(res.info);
         })

         spinalDevice.on("error", () => {
            resolve();
         })

         spinalDevice.init();
      });
   }

   private addDeviceFound(device: IDevice): void {
      console.log("device found", device.address);
      this.discoverModel.devices.push(device);
   }

   private async createNodes() {
      console.log("creating nodes...");

      try {
         const queue = new SpinalQueuing();
         queue.setQueue(Array.from(this.devices.keys()));
         const { networkService, network } = await SpinalNetworkServiceUtilities.initSpinalDiscoverNetwork(this.discoverModel);
         const devices = await this.getDevices(network.id.get());


         let isFinish = false;

         while (!isFinish) {
            const value = queue.dequeue();
            if (typeof value !== "undefined") {
               const node = devices.find(el => el.idNetwork.get() == value);
               const device = this.devices.get(value);
               await device.createStructureNodes(networkService, node, network.id.get());
            } else {
               isFinish = true;
            }
         }

         this.discoverModel.setCreatedMode();
         this.discoverModel.state.unbind(this.bindSateProcess);
         this.discoverModel.remove();
         console.log("nodes created!");
      } catch (error) {
         this.discoverModel.setErrorMode();
         this.discoverModel.state.unbind(this.bindSateProcess);
         this.discoverModel.remove();
      }

   }

   private getDevices(id: string): Promise<SpinalNodeRef[]> {
      return SpinalGraphService.getChildren(id, [SpinalBmsDevice.relationName])
   }

}


export class SpinalApiDiscover {
   private bindSateProcess: any;
   private protocol : string;
   private ip_address : string;
   private port : string;
   private path : string;
   private site : string;
   private CONNECTION_TIME_OUT: number;
   private devices: Map<number, SpinalApiDevice> = new Map();
   private discoverModel: any;
   private options: any = {
      headers: {
          'content-type': 'application/json; charset=utf-8',
          Authorization: "Basic "+ Buffer.from(username + ':' + password, 'utf8').toString('base64')
      },
      json: true,
      responseType: 'arraybuffer',
      reponseEncoding: 'binary',
      withCredentials: true
  };


   constructor(model) {
      this.discoverModel = model;
      this.CONNECTION_TIME_OUT = model.network?.timeout?.get() || 45000;

      this.init(model)
   }

   public init(model: any) {
      this.protocol = model.network?.protocol?.get() || "http";
      this.ip_address = model.network?.address?.get() || "127.0.0.1";
      this.port = model.network?.port?.get() || "80";
      this.path = model.network?.path?.get() || "/api/.bacnet/";
      this.site = model.network?.site?.get() || "";

      this.bindState();
   }

   private bindState(): void {
      this.bindSateProcess = this.discoverModel.state.bind(() => {
         switch (this.discoverModel.state.get()) {
            case STATES.discovering:
               console.log("discovering");
               this.discover();
               break;
            case STATES.creating:
               console.log("creating - In progress");
               this.createNodes();   // After clicking CREATE NETWORK in studio
            default:
               break;
         }
      })
   }

   private async sendRequest(path : string) {
    try {
         const res = await axios.get(this.protocol + "://" + this.ip_address + ":" + this.port + this.path + path, this.options);
         return JSON.parse(res.data);
    } catch (error) {
        console.log(error);
    }
   }

   private async discover() {
      try {
         const queue = await this.getDevicesQueue();

         let isFinish = false;

         while (!isFinish) {
            const item = queue.dequeue();

            if (typeof item !== "undefined") {
               const info = await this.createSpinalDevice(item);
               if (info) this.addDeviceFound(info);
            } else {
               console.log("isFinish");
               isFinish = true;
            }
         }

         if (this.discoverModel.devices.length !== 0) {
            console.log("discovered");
            this.discoverModel.setDiscoveredMode();

         } else {
            console.log("Timeout !");
            this.discoverModel.setTimeoutMode();

         }

      } catch (error) {
         console.log("Timeout...");
         this.discoverModel.setTimeoutMode();
      }

   }

   private getDevicesQueue(): Promise<SpinalQueuing> {
      const queue: SpinalQueuing = new SpinalQueuing();
      return new Promise((resolve, reject) => {

         let timeOutId = setTimeout(() => {
            reject("[TIMEOUT] - Cannot establish connection with BACnet API server.");
         }, this.CONNECTION_TIME_OUT);
         
         console.log("Using api server");

         //1- Api call to get devices
         const devices = this.sendRequest(`${this.site}?alt=json`);

         //2- Put devices in queue
         devices.then((res) => {
            if (typeof timeOutId !== "undefined") {
               clearTimeout(timeOutId);
            }
            for(let deviceId of Object.keys(res)) {
               if (deviceId != "$base") {
                  let name = res[deviceId]["displayName"]
                  queue.addToQueue({deviceId,name,site: this.site});
               }

            }

         })
         queue.on("start", () => {
            resolve(queue)
         });

      });

   }

   private createSpinalDevice(device): Promise<IApiDevice | void> {
 
      return new Promise((resolve, reject) => {
         const spinalDevice = new SpinalApiDevice(device);

         spinalDevice.on("initialized", (res) => {
            this.devices.set(res.device.deviceId, res);
            resolve(res.info);
         })

         spinalDevice.on("error", () => {
            resolve();
         })

         spinalDevice.init();
      });
   }

   private addDeviceFound(device: IApiDevice): void {
      console.log("device found ", device.deviceId);
      this.discoverModel.devices.push(device);
   }

   private async createNodes() {
      console.log("creating nodes...");

      try {
         const queue = new SpinalQueuing();
         queue.setQueue(Array.from(this.devices.keys()));
         const { networkService, network } = await SpinalNetworkServiceUtilities.initSpinalDiscoverNetwork(this.discoverModel);
         const devices = await this.getDevices(network.id.get());
         console.log("devices :",devices)
         let isFinish = false;

         while (!isFinish) {
            const value = queue.dequeue();
            if (typeof value !== "undefined") {
               const node = devices.find(el => el.idNetwork.get() == value);
               console.log("node :",node)
               const device = this.devices.get(value);
               console.log("device :",device)
               await device.createStructureNodes(networkService, node, network.id.get());
            } else {
               isFinish = true;
            }
         }

         this.discoverModel.setCreatedMode();
         this.discoverModel.state.unbind(this.bindSateProcess);
         this.discoverModel.remove();
         console.log("nodes created!");
      } catch (error) {
         this.discoverModel.setErrorMode();
         this.discoverModel.state.unbind(this.bindSateProcess);
         this.discoverModel.remove();
      }

   }

   private getDevices(id: string): Promise<SpinalNodeRef[]> {
      return SpinalGraphService.getChildren(id, [SpinalBmsDevice.relationName])
   }
}

