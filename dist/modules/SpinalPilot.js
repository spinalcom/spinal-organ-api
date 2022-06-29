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
exports.spinalPilot = void 0;
const SpinalQueuing_1 = require("../utilities/SpinalQueuing");
const GlobalVariables_1 = require("../utilities/GlobalVariables");
const bacnet = require("bacstack");
class SpinalPilot {
    constructor() {
        this.queue = new SpinalQueuing_1.SpinalQueuing();
        this.isProcessing = false;
    }
    init() {
        this.queue.on("start", () => {
            console.log("start pilot...");
            this.pilot();
        });
    }
    addToPilotList(spinalPilotModel) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("addToQueue");
            this.queue.addToQueue(spinalPilotModel);
        });
    }
    pilot() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isProcessing) {
                this.isProcessing = true;
                // console.log(this.queue);
                while (!this.queue.isEmpty()) {
                    const pilot = this.queue.dequeue();
                    if (pilot === null || pilot === void 0 ? void 0 : pilot.isNormal()) {
                        pilot.setProcessMode();
                        try {
                            yield this.writeProperties(pilot === null || pilot === void 0 ? void 0 : pilot.requests.get());
                            console.log("success");
                            pilot.setSuccessMode();
                            yield pilot.removeToNode();
                        }
                        catch (error) {
                            console.error(error.message);
                            pilot.setErrorMode();
                            yield pilot.removeToNode();
                        }
                    }
                    else {
                        console.log("remove");
                        yield pilot.removeToNode();
                    }
                    // console.log("pilot",pilot)
                }
                this.isProcessing = false;
            }
        });
    }
    writeProperties(requests = []) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let index = 0; index < requests.length; index++) {
                const req = requests[index];
                try {
                    yield this.writeProperty(req);
                }
                catch (error) {
                    throw error;
                }
            }
        });
    }
    writeProperty(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const types = this.getDataTypes(req.objectId.type);
            let success = false;
            while (types.length > 0 && !success) {
                const type = types.shift();
                try {
                    yield this.useDataType(req, type);
                    success = true;
                }
                catch (error) {
                    // throw error;
                }
            }
            if (!success) {
                throw new Error("error");
            }
        });
    }
    useDataType(req, dataType) {
        return new Promise((resolve, reject) => {
            const client = new bacnet();
            const value = dataType === GlobalVariables_1.APPLICATION_TAGS.BACNET_APPLICATION_TAG_ENUMERATED ? (req.value ? 1 : 0) : req.value;
            client.writeProperty(req.address, req.objectId, GlobalVariables_1.PropertyIds.PROP_PRESENT_VALUE, [{ type: dataType, value: value }], { priority: 8 }, (err, value) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(value);
            });
        });
    }
    getDataTypes(type) {
        switch (type) {
            case GlobalVariables_1.ObjectTypes.OBJECT_ANALOG_INPUT:
            case GlobalVariables_1.ObjectTypes.OBJECT_ANALOG_OUTPUT:
            case GlobalVariables_1.ObjectTypes.OBJECT_ANALOG_VALUE:
            case GlobalVariables_1.ObjectTypes.OBJECT_MULTI_STATE_INPUT:
            case GlobalVariables_1.ObjectTypes.OBJECT_MULTI_STATE_OUTPUT:
            case GlobalVariables_1.ObjectTypes.OBJECT_MULTI_STATE_VALUE:
                return [
                    GlobalVariables_1.APPLICATION_TAGS.BACNET_APPLICATION_TAG_UNSIGNED_INT,
                    GlobalVariables_1.APPLICATION_TAGS.BACNET_APPLICATION_TAG_SIGNED_INT,
                    GlobalVariables_1.APPLICATION_TAGS.BACNET_APPLICATION_TAG_REAL,
                    GlobalVariables_1.APPLICATION_TAGS.BACNET_APPLICATION_TAG_DOUBLE
                ];
            case GlobalVariables_1.ObjectTypes.OBJECT_BINARY_INPUT:
            case GlobalVariables_1.ObjectTypes.OBJECT_BINARY_OUTPUT:
            case GlobalVariables_1.ObjectTypes.OBJECT_BINARY_VALUE:
            case GlobalVariables_1.ObjectTypes.OBJECT_BINARY_LIGHTING_OUTPUT:
                return [
                    GlobalVariables_1.APPLICATION_TAGS.BACNET_APPLICATION_TAG_ENUMERATED,
                    GlobalVariables_1.APPLICATION_TAGS.BACNET_APPLICATION_TAG_BOOLEAN
                ];
            default:
                return [
                    GlobalVariables_1.APPLICATION_TAGS.BACNET_APPLICATION_TAG_OCTET_STRING,
                    GlobalVariables_1.APPLICATION_TAGS.BACNET_APPLICATION_TAG_CHARACTER_STRING,
                    GlobalVariables_1.APPLICATION_TAGS.BACNET_APPLICATION_TAG_BIT_STRING
                ];
        }
    }
}
const spinalPilot = new SpinalPilot();
exports.spinalPilot = spinalPilot;
spinalPilot.init();
exports.default = spinalPilot;
//# sourceMappingURL=SpinalPilot.js.map