"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spinalMonitoring = void 0;
const priority_queue_1 = require("@datastructures-js/priority-queue");
const SpinalNetworkServiceUtilities_1 = require("../utilities/SpinalNetworkServiceUtilities");
const SpinalQueuing_1 = require("../utilities/SpinalQueuing");
const lodash = require("lodash");
class SpinalMonitoring {
    constructor() {
        this.queue = new SpinalQueuing_1.SpinalQueuing();
        // private priorityQueue: MinPriorityQueue<{ interval: number; functions: { id: string; func: Function }[] }> = new MinPriorityQueue();
        this.priorityQueue = new priority_queue_1.MinPriorityQueue();
        this.isProcessing = false;
        this.intervalTimesMap = new Map();
        this.initializedMap = new Map();
        this.binded = [];
        this.devices = [];
    }
    addToMonitoringList(spinalListenerModel) {
        return __awaiter(this, void 0, void 0, function* () {
            this.queue.addToQueue(spinalListenerModel);
        });
    }
    init() {
        this.queue.on("start", () => {
            console.log("start initialisation...");
            this.startDeviceInitialisation();
        });
    }
    startDeviceInitialisation() {
        return __awaiter(this, void 0, void 0, function* () {
            const list = this.queue.getQueue();
            this.queue.refresh();
            const promises = list.map(el => SpinalNetworkServiceUtilities_1.SpinalNetworkServiceUtilities.initSpinalListenerModel(el));
            const devices = lodash.flattenDeep(yield Promise.all(promises)).filter(el => typeof el !== "undefined");
            yield this._createMaps(devices);
            // await this.addToQueue(filtered);
            if (!this.isProcessing) {
                this.isProcessing = true;
                this.startMonitoring();
            }
        });
    }
    startMonitoring() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("start monitoring...");
            let p = true;
            while (p) {
                if (this.priorityQueue.isEmpty()) {
                    // console.log("priority queue is empty");
                    yield this.waitFct(100);
                    continue;
                }
                const { priority, element } = this.priorityQueue.dequeue();
                const functions = this.intervalTimesMap.get(element.interval);
                if (functions && functions.length > 0) {
                    yield this.execFunc(functions, element.interval, priority);
                }
            }
        });
    }
    _createMaps(devices) {
        return __awaiter(this, void 0, void 0, function* () {
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
                const intervals = yield this.getValidIntervals(spinalDevice, networkService, spinalModel, network, monitors);
                for (const { interval, func } of intervals) {
                    this._addToMap(id, interval, func);
                }
                if (this.binded.indexOf(id) === -1) {
                    spinalModel.listen.bind(() => {
                        console.log("listen changed");
                        this.addToMonitoringList(spinalModel);
                    });
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
        });
    }
    _addToMap(id, interval, func) {
        let value = this.intervalTimesMap.get(interval);
        if (typeof value === "undefined") {
            value = [];
        }
        value.push({ id, func });
        this.intervalTimesMap.set(interval, value);
        this._addIntervalToPriorityQueue(interval);
    }
    removeToMaps(deviceId) {
        this.intervalTimesMap.forEach((value, key) => {
            this.intervalTimesMap.set(key, value.filter(el => el.id !== deviceId));
        });
    }
    _addIntervalToPriorityQueue(interval) {
        const arr = this.priorityQueue.toArray();
        const found = arr.find(({ element }) => {
            return element.interval === interval;
        });
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
    execFunc(functions, interval, date) {
        return __awaiter(this, void 0, void 0, function* () {
            if (date && Date.now() < date) {
                console.log("wait");
                yield this.waitFct(date - Date.now());
            }
            try {
                const deep_functions = [...functions];
                while (deep_functions.length > 0) {
                    try {
                        const { func } = deep_functions.shift();
                        if (typeof func === "function") {
                            yield func();
                        }
                    }
                    catch (error) {
                        console.error(error);
                    }
                }
                this.priorityQueue.enqueue({ interval }, Date.now() + interval);
            }
            catch (error) {
                console.error(error);
                this.priorityQueue.enqueue({ interval }, Date.now() + interval);
            }
        });
    }
    createDataIfNotExist(spinalDevice, children, networkService, interval) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = `${spinalDevice.device.deviceId}_${interval}`;
                let init = this.initializedMap.get(id);
                if (!init) {
                    // console.log("initialisation");
                    this.initializedMap.set(id, true);
                    yield spinalDevice.checkAndCreateIfNotExist(networkService, children);
                }
            }
            catch (error) {
                console.error(error);
            }
        });
    }
    funcToExecute(spinalModel, spinalDevice, children, networkService, network) {
        return __awaiter(this, void 0, void 0, function* () {
            if (spinalModel.listen.get() && (children === null || children === void 0 ? void 0 : children.length) > 0) {
                yield spinalDevice.updateEndpoints(networkService, network, children);
            }
        });
    }
    getValidIntervals(spinalDevice, networkService, spinalModel, network, monitors) {
        return __awaiter(this, void 0, void 0, function* () {
            const monitors_copy = Object.assign([], monitors);
            const res = [];
            while (monitors_copy.length > 0) {
                const { interval, children } = monitors_copy.shift();
                if (isNaN(interval) || interval <= 0 || children.length <= 0)
                    continue;
                //await this.createDataIfNotExist(spinalDevice, children, networkService, interval); !!!REMOVE
                const func = () => __awaiter(this, void 0, void 0, function* () { return this.funcToExecute(spinalModel, spinalDevice, children, networkService, network); });
                res.push({
                    interval,
                    children,
                    func
                });
            }
            return res;
        });
    }
    waitFct(nb) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, nb >= 0 ? nb : 0);
        });
    }
}
const spinalMonitoring = new SpinalMonitoring();
exports.spinalMonitoring = spinalMonitoring;
spinalMonitoring.init();
exports.default = spinalMonitoring;
//# sourceMappingURL=SpinalMonitoring.js.map