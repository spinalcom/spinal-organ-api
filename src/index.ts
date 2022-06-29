import {
   SpinalDisoverModel, SpinalListenerModel,
   SpinalOrganConfigModel, SpinalBacnetValueModel, SpinalPilotModel, SpinalApiDiscoverModel
} from "spinal-model-bacnet";

import {
   SpinalDiscoverCallback, SpinalListnerCallback,
   SpinalBacnetValueModelCallback, connectionErrorCallback,
   CreateOrganConfigFile, GetPm2Instance, SpinalPilotCallback
} from './utilities/Functions';

require("json5/lib/register");

import { spinalCore } from "spinal-core-connectorjs_type";
const pm2 = require("pm2");
const config = require("../config.json5");
const { protocol, host, port, userId, password, path, name } = config.spinalConnector;
const url = `${protocol}://${userId}:${password}@${host}:${port}/`;
const connect = spinalCore.connect(url);



CreateOrganConfigFile(connect, path, name).then((organModel: SpinalOrganConfigModel) => {

   organModel.restart.bind(() => {
      GetPm2Instance(name).then(async (app: any) => {
         const restart = organModel.restart.get();

         if (!restart) {
            listenLoadType(connect, organModel);
            return;
         }

         if (app) {
            console.log("restart organ", app.pm_id);
            organModel.restart.set(false)

            pm2.restart(app.pm_id, (err) => {
               if (err) {
                  console.error(err);
                  return;
               }
               console.log("organ restarted with success !");
            })
         }

      })
   })
})

const listenLoadType = (connect, organModel) => {
   // return new Promise((resolve, reject) => {
   /*loadTypeInSpinalCore(connect, 'SpinalDisoverModel', (spinalDisoverModel: SpinalDisoverModel) => {
      SpinalDiscoverCallback(spinalDisoverModel, organModel)
   }, connectionErrorCallback);*/

   loadTypeInSpinalCore(connect, 'SpinalApiDiscoverModel', (spinalApiDiscoverModel: SpinalApiDiscoverModel) => {
      SpinalDiscoverCallback(spinalApiDiscoverModel, organModel)
   }, connectionErrorCallback);
   

   loadTypeInSpinalCore(connect, 'SpinalListenerModel', (spinalListenerModel: SpinalListenerModel) => {
      SpinalListnerCallback(spinalListenerModel, organModel);
   }, connectionErrorCallback);


   // récupère les données de la valeur bacnet
   loadTypeInSpinalCore(connect, 'SpinalBacnetValueModel', (spinalBacnetValueModel: SpinalBacnetValueModel) => {
      SpinalBacnetValueModelCallback(spinalBacnetValueModel, organModel);
   }, connectionErrorCallback);


   /*loadTypeInSpinalCore(connect, 'SpinalPilotModel', (spinalPilotModel: SpinalPilotModel) => {
      SpinalPilotCallback(spinalPilotModel, organModel);
   }, connectionErrorCallback);*/


   // });
}

const loadTypeInSpinalCore = (connect, type, callback, errorCallback) => {
   spinalCore.load_type(connect, type, callback, errorCallback);
}