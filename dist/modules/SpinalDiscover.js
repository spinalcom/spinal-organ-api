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
exports.SpinalApiDiscover = exports.SpinalDiscover = exports.discover = void 0;
const bacnet = require("bacstack");
const events_1 = require("events");
const SpinalQueuing_1 = require("../utilities/SpinalQueuing");
const spinal_env_viewer_graph_service_1 = require("spinal-env-viewer-graph-service");
const spinal_model_bmsnetwork_1 = require("spinal-model-bmsnetwork");
const SpinalDevice_1 = require("./SpinalDevice");
const spinal_model_bacnet_1 = require("spinal-model-bacnet");
const axios_1 = require("axios");
const SpinalNetworkServiceUtilities_1 = require("../utilities/SpinalNetworkServiceUtilities");
const config = require("../../config.json5");
const { username, password } = config.clientConnector;
class Discover extends events_1.EventEmitter {
    constructor() {
        super();
        this._discoverQueue = new SpinalQueuing_1.SpinalQueuing();
        this._isProcess = false;
        this.listenEvent();
    }
    listenEvent() {
        this._discoverQueue.on("start", () => {
            if (!this._isProcess) {
                this._isProcess = true;
                this._discoverNext();
            }
        });
        this.on("next", () => {
            this._discoverNext();
        });
    }
    addToQueue(model) {
        this._discoverQueue.addToQueue(model);
    }
    _discoverNext() {
        if (!this._discoverQueue.isEmpty()) {
            const model = this._discoverQueue.dequeue();
            const spinalDiscover = new SpinalApiDiscover(model); //????????????????????????;
            let timeout = false;
            let bindSateProcess = model.state.bind(() => {
                const state = model.state.get();
                switch (state) {
                    case spinal_model_bacnet_1.STATES.discovered:
                        model.state.unbind(bindSateProcess);
                        if (!timeout) {
                            this.emit("next");
                        }
                        break;
                    case spinal_model_bacnet_1.STATES.timeout:
                        if (!timeout) {
                            this.emit("next");
                        }
                        timeout = true;
                    default:
                        break;
                }
            });
        }
        else {
            this._isProcess = false;
        }
    }
}
exports.discover = new Discover();
class SpinalDiscover {
    constructor(model) {
        var _a, _b;
        this.devices = new Map();
        this.discoverModel = model;
        this.CONNECTION_TIME_OUT = ((_b = (_a = model.network) === null || _a === void 0 ? void 0 : _a.timeout) === null || _b === void 0 ? void 0 : _b.get()) || 45000;
        this.init(model);
    }
    init(model) {
        var _a, _b, _c, _d;
        this.client = new bacnet({
            broadcastAddress: (_b = (_a = model.network) === null || _a === void 0 ? void 0 : _a.address) === null || _b === void 0 ? void 0 : _b.get(),
            port: ((_d = (_c = model.network) === null || _c === void 0 ? void 0 : _c.port) === null || _d === void 0 ? void 0 : _d.get()) || 47808,
            adpuTimeout: 6000
        });
        this.client.on('error', (err) => {
            console.log('Error occurred: ', err);
            this.client.close();
        });
        this.bindState();
    }
    bindState() {
        this.bindSateProcess = this.discoverModel.state.bind(() => {
            switch (this.discoverModel.state.get()) {
                case spinal_model_bacnet_1.STATES.discovering:
                    console.log("discovering");
                    this.discover();
                    break;
                case spinal_model_bacnet_1.STATES.creating:
                    this.createNodes();
                default:
                    break;
            }
        });
    }
    discover() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const queue = yield this.getDevicesQueue();
                let isFinish = false;
                while (!isFinish) {
                    const item = queue.dequeue();
                    if (typeof item !== "undefined") {
                        const info = yield this.createSpinalDevice(item);
                        if (info)
                            this.addDeviceFound(info);
                    }
                    else {
                        console.log("isFinish");
                        isFinish = true;
                    }
                }
                if (this.discoverModel.devices.length !== 0) {
                    console.log("discovered");
                    this.discoverModel.setDiscoveredMode();
                }
                else {
                    console.log("Timeout !");
                    this.discoverModel.setTimeoutMode();
                }
            }
            catch (error) {
                console.log("Timeout...");
                this.discoverModel.setTimeoutMode();
            }
        });
    }
    getDevicesQueue() {
        const queue = new SpinalQueuing_1.SpinalQueuing();
        return new Promise((resolve, reject) => {
            var _a, _b, _c, _d;
            // if (this.discoverModel.network?.useBroadcast?.get()) {
            //    console.log("use broadcast");
            let timeOutId;
            if ((_b = (_a = this.discoverModel.network) === null || _a === void 0 ? void 0 : _a.useBroadcast) === null || _b === void 0 ? void 0 : _b.get()) {
                console.log("use broadcast");
                timeOutId = setTimeout(() => {
                    reject("[TIMEOUT] - Cannot establish connection with BACnet server.");
                }, this.CONNECTION_TIME_OUT);
                this.client.whoIs();
            }
            else {
                // ips.forEach(({ address, deviceId }) => {
                //    this.client.whoIs({ address })
                // });
                console.log("use unicast");
                const ips = ((_d = (_c = this.discoverModel.network) === null || _c === void 0 ? void 0 : _c.ips) === null || _d === void 0 ? void 0 : _d.get()) || [];
                const devices = ips.filter(({ address, deviceId }) => address && deviceId)
                    .map(({ address, deviceId }) => {
                    return { address, deviceId: parseInt(deviceId) };
                });
                queue.setQueue(devices);
            }
            const res = [];
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
            });
            queue.on("start", () => {
                resolve(queue);
            });
        });
    }
    createSpinalDevice(device) {
        return new Promise((resolve, reject) => {
            const spinalDevice = new SpinalDevice_1.SpinalDevice(device, this.client);
            spinalDevice.on("initialized", (res) => {
                this.devices.set(res.device.deviceId, res);
                resolve(res.info);
            });
            spinalDevice.on("error", () => {
                resolve();
            });
            spinalDevice.init();
        });
    }
    addDeviceFound(device) {
        console.log("device found", device.address);
        this.discoverModel.devices.push(device);
    }
    createNodes() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("creating nodes...");
            try {
                const queue = new SpinalQueuing_1.SpinalQueuing();
                queue.setQueue(Array.from(this.devices.keys()));
                const { networkService, network } = yield SpinalNetworkServiceUtilities_1.SpinalNetworkServiceUtilities.initSpinalDiscoverNetwork(this.discoverModel);
                const devices = yield this.getDevices(network.id.get());
                let isFinish = false;
                while (!isFinish) {
                    const value = queue.dequeue();
                    if (typeof value !== "undefined") {
                        const node = devices.find(el => el.idNetwork.get() == value);
                        const device = this.devices.get(value);
                        yield device.createStructureNodes(networkService, node, network.id.get());
                    }
                    else {
                        isFinish = true;
                    }
                }
                this.discoverModel.setCreatedMode();
                this.discoverModel.state.unbind(this.bindSateProcess);
                this.discoverModel.remove();
                console.log("nodes created!");
            }
            catch (error) {
                this.discoverModel.setErrorMode();
                this.discoverModel.state.unbind(this.bindSateProcess);
                this.discoverModel.remove();
            }
        });
    }
    getDevices(id) {
        return spinal_env_viewer_graph_service_1.SpinalGraphService.getChildren(id, [spinal_model_bmsnetwork_1.SpinalBmsDevice.relationName]);
    }
}
exports.SpinalDiscover = SpinalDiscover;
class SpinalApiDiscover {
    constructor(model) {
        var _a, _b;
        this.devices = new Map();
        this.options = {
            headers: {
                'content-type': 'application/json; charset=utf-8',
                Authorization: "Basic " + Buffer.from(username + ':' + password, 'utf8').toString('base64')
            },
            json: true,
            responseType: 'arraybuffer',
            reponseEncoding: 'binary',
            withCredentials: true
        };
        this.discoverModel = model;
        this.CONNECTION_TIME_OUT = ((_b = (_a = model.network) === null || _a === void 0 ? void 0 : _a.timeout) === null || _b === void 0 ? void 0 : _b.get()) || 45000;
        this.init(model);
    }
    init(model) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        this.protocol = ((_b = (_a = model.network) === null || _a === void 0 ? void 0 : _a.protocol) === null || _b === void 0 ? void 0 : _b.get()) || "http";
        this.ip_address = ((_d = (_c = model.network) === null || _c === void 0 ? void 0 : _c.address) === null || _d === void 0 ? void 0 : _d.get()) || "127.0.0.1";
        this.port = ((_f = (_e = model.network) === null || _e === void 0 ? void 0 : _e.port) === null || _f === void 0 ? void 0 : _f.get()) || "80";
        this.path = ((_h = (_g = model.network) === null || _g === void 0 ? void 0 : _g.path) === null || _h === void 0 ? void 0 : _h.get()) || "/api/.bacnet/";
        this.site = ((_k = (_j = model.network) === null || _j === void 0 ? void 0 : _j.site) === null || _k === void 0 ? void 0 : _k.get()) || "";
        this.bindState();
    }
    bindState() {
        this.bindSateProcess = this.discoverModel.state.bind(() => {
            switch (this.discoverModel.state.get()) {
                case spinal_model_bacnet_1.STATES.discovering:
                    console.log("discovering");
                    this.discover();
                    break;
                case spinal_model_bacnet_1.STATES.creating:
                    console.log("creating - In progress");
                    this.createNodes(); // After clicking CREATE NETWORK in studio
                default:
                    break;
            }
        });
    }
    sendRequest(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield axios_1.default.get(this.protocol + "://" + this.ip_address + ":" + this.port + this.path + path, this.options);
                return JSON.parse(res.data);
            }
            catch (error) {
                console.log(error);
            }
        });
    }
    discover() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const queue = yield this.getDevicesQueue();
                let isFinish = false;
                while (!isFinish) {
                    const item = queue.dequeue();
                    if (typeof item !== "undefined") {
                        const info = yield this.createSpinalDevice(item);
                        if (info)
                            this.addDeviceFound(info);
                    }
                    else {
                        console.log("isFinish");
                        isFinish = true;
                    }
                }
                if (this.discoverModel.devices.length !== 0) {
                    console.log("discovered");
                    this.discoverModel.setDiscoveredMode();
                }
                else {
                    console.log("Timeout !");
                    this.discoverModel.setTimeoutMode();
                }
            }
            catch (error) {
                console.log("Timeout...");
                this.discoverModel.setTimeoutMode();
            }
        });
    }
    getDevicesQueue() {
        const queue = new SpinalQueuing_1.SpinalQueuing();
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
                for (let deviceId of Object.keys(res)) {
                    if (deviceId != "$base") {
                        let name = res[deviceId]["displayName"];
                        queue.addToQueue({ deviceId, name, site: this.site });
                    }
                }
            });
            queue.on("start", () => {
                resolve(queue);
            });
        });
    }
    createSpinalDevice(device) {
        return new Promise((resolve, reject) => {
            const spinalDevice = new SpinalDevice_1.SpinalApiDevice(device);
            spinalDevice.on("initialized", (res) => {
                this.devices.set(res.device.deviceId, res);
                resolve(res.info);
            });
            spinalDevice.on("error", () => {
                resolve();
            });
            spinalDevice.init();
        });
    }
    addDeviceFound(device) {
        console.log("device found ", device.deviceId);
        this.discoverModel.devices.push(device);
    }
    createNodes() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("creating nodes...");
            try {
                const queue = new SpinalQueuing_1.SpinalQueuing();
                queue.setQueue(Array.from(this.devices.keys()));
                const { networkService, network } = yield SpinalNetworkServiceUtilities_1.SpinalNetworkServiceUtilities.initSpinalDiscoverNetwork(this.discoverModel);
                const devices = yield this.getDevices(network.id.get());
                console.log("devices :", devices);
                let isFinish = false;
                while (!isFinish) {
                    const value = queue.dequeue();
                    if (typeof value !== "undefined") {
                        const node = devices.find(el => el.idNetwork.get() == value);
                        console.log("node :", node);
                        const device = this.devices.get(value);
                        console.log("device :", device);
                        yield device.createStructureNodes(networkService, node, network.id.get());
                    }
                    else {
                        isFinish = true;
                    }
                }
                this.discoverModel.setCreatedMode();
                this.discoverModel.state.unbind(this.bindSateProcess);
                this.discoverModel.remove();
                console.log("nodes created!");
            }
            catch (error) {
                this.discoverModel.setErrorMode();
                this.discoverModel.state.unbind(this.bindSateProcess);
                this.discoverModel.remove();
            }
        });
    }
    getDevices(id) {
        return spinal_env_viewer_graph_service_1.SpinalGraphService.getChildren(id, [spinal_model_bmsnetwork_1.SpinalBmsDevice.relationName]);
    }
}
exports.SpinalApiDiscover = SpinalApiDiscover;
//# sourceMappingURL=SpinalDiscover.js.map