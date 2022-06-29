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
require("json5/lib/register");
const spinal_core_connectorjs_type_1 = require("spinal-core-connectorjs_type");
const Functions_1 = require("./utilities/Functions");
const pm2 = require("pm2");
const config = require("../config.json5");
const { protocol, host, port, userId, password, path, name } = config.spinalConnector;
const url = `${protocol}://${userId}:${password}@${host}:${port}/`;
const connect = spinal_core_connectorjs_type_1.spinalCore.connect(url);
Functions_1.CreateOrganConfigFile(connect, path, name).then((organModel) => {
    organModel.restart.bind(() => {
        Functions_1.GetPm2Instance(name).then((app) => __awaiter(void 0, void 0, void 0, function* () {
            const restart = organModel.restart.get();
            if (!restart) {
                listenLoadType(connect, organModel);
                return;
            }
            if (app) {
                console.log("restart organ", app.pm_id);
                organModel.restart.set(false);
                pm2.restart(app.pm_id, (err) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    console.log("organ restarted with success !");
                });
            }
        }));
    });
});
const listenLoadType = (connect, organModel) => {
    // return new Promise((resolve, reject) => {
    /*loadTypeInSpinalCore(connect, 'SpinalDisoverModel', (spinalDisoverModel: SpinalDisoverModel) => {
       SpinalDiscoverCallback(spinalDisoverModel, organModel)
    }, connectionErrorCallback);*/
    loadTypeInSpinalCore(connect, 'SpinalApiDiscoverModel', (spinalApiDiscoverModel) => {
        Functions_1.SpinalDiscoverCallback(spinalApiDiscoverModel, organModel);
    }, Functions_1.connectionErrorCallback);
    loadTypeInSpinalCore(connect, 'SpinalListenerModel', (spinalListenerModel) => {
        Functions_1.SpinalListnerCallback(spinalListenerModel, organModel);
    }, Functions_1.connectionErrorCallback);
    // récupère les données de la valeur bacnet
    loadTypeInSpinalCore(connect, 'SpinalBacnetValueModel', (spinalBacnetValueModel) => {
        Functions_1.SpinalBacnetValueModelCallback(spinalBacnetValueModel, organModel);
    }, Functions_1.connectionErrorCallback);
    /*loadTypeInSpinalCore(connect, 'SpinalPilotModel', (spinalPilotModel: SpinalPilotModel) => {
       SpinalPilotCallback(spinalPilotModel, organModel);
    }, connectionErrorCallback);*/
    // });
};
const loadTypeInSpinalCore = (connect, type, callback, errorCallback) => {
    spinal_core_connectorjs_type_1.spinalCore.load_type(connect, type, callback, errorCallback);
};
//# sourceMappingURL=index.js.map