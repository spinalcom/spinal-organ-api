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
exports.SpinalNetworkServiceUtilities = void 0;
const spinal_model_bmsnetwork_1 = require("spinal-model-bmsnetwork");
const spinal_env_viewer_graph_service_1 = require("spinal-env-viewer-graph-service");
const SpinalDevice_1 = require("../modules/SpinalDevice");
class SpinalNetworkServiceUtilities {
    constructor() { }
    static initSpinalDiscoverNetwork(spinalModel) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this._getSpinalDiscoverModel(spinalModel);
            const networkService = new spinal_model_bmsnetwork_1.NetworkService(false);
            yield networkService.init(data.graph, data.organ);
            return {
                networkService: networkService,
                network: yield this._getOrCreateNetworkNode(spinalModel.network.get(), networkService)
            };
        });
    }
    static initSpinalBacnetValueModel(spinalModel) {
        return __awaiter(this, void 0, void 0, function* () {
            const { node, context, graph, network, organ } = yield spinalModel.getAllItem();
            if (node)
                spinal_env_viewer_graph_service_1.SpinalGraphService._addNode(node);
            if (context)
                spinal_env_viewer_graph_service_1.SpinalGraphService._addNode(context);
            if (graph)
                spinal_env_viewer_graph_service_1.SpinalGraphService._addNode(graph);
            if (network)
                spinal_env_viewer_graph_service_1.SpinalGraphService._addNode(network);
            const networkService = new spinal_model_bmsnetwork_1.NetworkService(false);
            const organNetwork = {
                contextName: context.getName().get(),
                contextType: context.getType().get(),
                networkType: network.getType().get(),
                networkName: network.getName().get()
            };
            yield networkService.init(graph, organNetwork);
            const device = node.info.get();
            return {
                networkService,
                device,
                organ,
                node
            };
        });
    }
    static initSpinalListenerModel(spinalModel) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const saveTimeSeries = ((_a = spinalModel.saveTimeSeries) === null || _a === void 0 ? void 0 : _a.get()) || false;
                const networkService = new spinal_model_bmsnetwork_1.NetworkService(saveTimeSeries);
                const [graph, device, network, context, organ] = yield Promise.all([
                    // const [graph, device, network, context, organ, profil] = await Promise.all([
                    this.loadPtrValue(spinalModel.graph),
                    this.loadPtrValue(spinalModel.device),
                    this.loadPtrValue(spinalModel.network),
                    this.loadPtrValue(spinalModel.context),
                    this.loadPtrValue(spinalModel.organ),
                ]);
                if (graph)
                    spinal_env_viewer_graph_service_1.SpinalGraphService._addNode(graph);
                if (device)
                    spinal_env_viewer_graph_service_1.SpinalGraphService._addNode(device);
                if (network)
                    spinal_env_viewer_graph_service_1.SpinalGraphService._addNode(network);
                if (context)
                    spinal_env_viewer_graph_service_1.SpinalGraphService._addNode(context);
                const spinalDevice = new SpinalDevice_1.SpinalDevice(device.info.get());
                yield networkService.init(graph, {
                    contextName: context.getName().get(),
                    contextType: context.getType().get(),
                    networkType: organ.type.get(),
                    networkName: organ.name.get()
                });
                (_b = spinalModel.saveTimeSeries) === null || _b === void 0 ? void 0 : _b.bind(() => {
                    var _a;
                    networkService.useTimeseries = ((_a = spinalModel.saveTimeSeries) === null || _a === void 0 ? void 0 : _a.get()) || false;
                });
                // const monitors = spinalModel.monitor.getMonitoringData();
                return {
                    id: device.info.id.get(),
                    spinalModel,
                    spinalDevice,
                    networkService,
                    network
                };
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
            }
            catch (error) {
                return;
            }
        });
    }
    /////////////////////////////////////////////////////////////
    ////              GET NETWORK SERVICE DATA                 //
    /////////////////////////////////////////////////////////////
    static _getSpinalDiscoverModel(discoverModel) {
        return __awaiter(this, void 0, void 0, function* () {
            const graph = yield this.loadPtrValue(discoverModel.graph);
            const organ = {
                contextName: discoverModel.context.name.get(),
                contextType: discoverModel.context.type.get(),
                networkType: discoverModel.organ.type.get(),
                networkName: discoverModel.organ.name.get()
            };
            return {
                graph,
                organ
            };
        });
    }
    static _getOrCreateNetworkNode(networkInfo, networkService) {
        return __awaiter(this, void 0, void 0, function* () {
            const organId = networkService.networkId;
            const contextId = networkService.contextId;
            const children = yield spinal_env_viewer_graph_service_1.SpinalGraphService.getChildrenInContext(organId, contextId);
            for (const child of children) {
                if (child.name.get() === networkInfo.name) {
                    return child;
                }
            }
            return networkService.createNewBmsNetwork(organId, networkInfo.type, networkInfo.name);
        });
    }
    static loadPtrValue(ptrModel) {
        return new Promise((resolve, reject) => {
            ptrModel.load((data) => {
                resolve(data);
            });
        });
    }
}
exports.SpinalNetworkServiceUtilities = SpinalNetworkServiceUtilities;
//# sourceMappingURL=SpinalNetworkServiceUtilities.js.map