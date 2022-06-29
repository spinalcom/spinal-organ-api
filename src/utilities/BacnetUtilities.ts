/*
 * Copyright 2021 SpinalCom - www.spinalcom.com
 * 
 * This file is part of SpinalCore.
 * 
 * Please read all of the following terms and conditions
 * of the Free Software license Agreement ("Agreement")
 * carefully.
 * 
 * This Agreement is a legally binding contract between
 * the Licensee (as defined below) and SpinalCom that
 * sets forth the terms and conditions that govern your
 * use of the Program. By installing and/or using the
 * Program, you agree to abide by all the terms and
 * conditions stated or referenced herein.
 * 
 * If you do not agree to abide by these terms and
 * conditions, do not demonstrate your acceptance and do
 * not install or use the Program.
 * You should have received a copy of the license along
 * with this file. If not, see
 * <http://resources.spinalcom.com/licenses.pdf>.
 */

import * as lodash from "lodash";
import * as bacnet from "bacstack";
import { SpinalGraphService, SpinalNodeRef } from "spinal-env-viewer-graph-service";
import { ObjectTypes, PropertyIds, PropertyNames, ObjectTypesCode, UNITS_TYPES } from "./GlobalVariables";
import { SpinalBmsEndpointGroup, NetworkService, SpinalBmsEndpoint } from "spinal-model-bmsnetwork";
import { IDevice, IObjectId, IReadPropertyMultiple, IRequestArray, IReadProperty } from "../Interfaces";
import { SEGMENTATIONS } from "../utilities/GlobalVariables";



export default class BacnetUtilities {
   constructor() { }


   ////////////////////////////////////////////////////////////////
   ////                  READ BACNET DATA                        //
   ////////////////////////////////////////////////////////////////

   public static readPropertyMultiple(address: string, requestArray: IRequestArray | IRequestArray[], argClient?: bacnet): Promise<IReadPropertyMultiple> {
      return new Promise((resolve, reject) => {
         try {
            const client = argClient || new bacnet();
            requestArray = Array.isArray(requestArray) ? requestArray : [requestArray];

            client.readPropertyMultiple(address, requestArray, (err, data) => {
               if (err) {
                  reject(err);
                  return;
               }
               resolve(data);
            })
         } catch (error) {
            reject(error);
         }
      });
   }

   public static readProperty(address: string, objectId: IObjectId, propertyId: number | string, argClient?: bacnet, clientOptions?: any): Promise<IReadProperty> {
      const client = argClient || new bacnet();
      const options = clientOptions || {};

      return new Promise((resolve, reject) => {
         client.readProperty(address, objectId, propertyId, options, (err, data) => {
            if (err) return reject(err);

            resolve(data);
         })
      });
   }

   ////////////////////////////////////////////////////////////////
   ////                  GET ALL OBJECT LIST                     //
   ////////////////////////////////////////////////////////////////
   public static async _getDeviceObjectList(device: IDevice, SENSOR_TYPES: Array<number>, argClient?: bacnet): Promise<Array<IObjectId>> {
      console.log("getting object list");
      const objectId = { type: ObjectTypes.OBJECT_DEVICE, instance: device.deviceId };
      let values;

      try {
         const deviceAcceptSegmentation = [SEGMENTATIONS.SEGMENTATION_BOTH, SEGMENTATIONS.SEGMENTATION_TRANSMIT].indexOf(device.segmentation) != -1;
         let params = deviceAcceptSegmentation ? [{ objectId: objectId, properties: [{ id: PropertyIds.PROP_OBJECT_LIST }] }] : [objectId, PropertyIds.PROP_OBJECT_LIST];
         let func = deviceAcceptSegmentation ? this.readPropertyMultiple : this.readProperty;

         const data = await func.call(this, device.address, ...params, argClient);
         values = deviceAcceptSegmentation ? lodash.flattenDeep(data.values.map(el => el.values.map(el2 => el2.value))) : data.values;

      } catch (error) {
         if (error.message.match(/reason:4/i) || error.message.match(/err_timeout/i)) values = await this.getItemListByFragment(device, objectId, argClient);

      }

      if (typeof values === "undefined") throw "No values found";

      return values.filter(item => SENSOR_TYPES.indexOf(item.value.type) !== -1);

   }


   public static async getItemListByFragment(device: IDevice, objectId: IObjectId, argClient?: bacnet) {
      const list = [];
      let error;
      let index = 1;
      let finish = false;

      return new Promise(async (resolve, reject) => {

         while (!error && !finish) {
            try {
               const clientOptions = { arrayIndex: index }
               const value = await this.readProperty(device.address, objectId, PropertyIds.PROP_OBJECT_LIST, argClient, clientOptions);
               if (value) {
                  index++;
                  list.push(...value.values);
               } else {
                  finish = true;
               }

            } catch (err) {
               error = err;
            }
         }

         resolve(list);
      });
   }

   ////////////////////////////////////////////////////////////////
   ////                  GET OBJECT DETAIL                       //
   ////////////////////////////////////////////////////////////////

   public static async _getObjectDetail(device: IDevice, objects: Array<IObjectId>, argClient?: any): Promise<Array<{ [key: string]: string | boolean | number }>> {

      let objectLists = [...objects];

      let objectListDetails = [];
      const deviceAcceptSegmentation = [SEGMENTATIONS.SEGMENTATION_BOTH, SEGMENTATIONS.SEGMENTATION_TRANSMIT].indexOf(device.segmentation) !== -1;

      const func = deviceAcceptSegmentation ? this._getObjectDetailWithReadPropertyMultiple : this._getObjectDetailWithReadProperty;


      if (deviceAcceptSegmentation) {
         objectLists = lodash.chunk(objects, 10);
      }

      while (objectLists.length > 0) {
         const object: any = objectLists.shift();
         if (object) {
            try {

               const res = await func.call(this, device, object, argClient);
               objectListDetails.push(res);
            } catch (err) { }
         }
      }

      if (deviceAcceptSegmentation) objectListDetails = lodash.flattenDeep(objectListDetails);

      return objectListDetails;

   }

   public static async _getObjectDetailWithReadPropertyMultiple(device: IDevice, objects: Array<IObjectId>, argClient?: any): Promise<Array<any>> {

      try {
         const requestArray: IRequestArray[] = objects.map(el => ({
            objectId: JSON.parse(JSON.stringify(el)),
            properties: [
               { id: PropertyIds.PROP_OBJECT_NAME },
               { id: PropertyIds.PROP_PRESENT_VALUE },
               { id: PropertyIds.PROP_OBJECT_TYPE },
               { id: PropertyIds.PROP_UNITS },
               { id: PropertyIds.PROP_MAX_PRES_VALUE },
               { id: PropertyIds.PROP_MIN_PRES_VALUE }
            ]
         }))
         const data = await this.readPropertyMultiple(device.address, requestArray, argClient);
         return data.values.map(el => {
            const { objectId } = el;

            const obj = {
               objectId: objectId,
               id: objectId.instance,
               typeId: objectId.type,
               type: this._getObjectTypeByCode(objectId.type),
               instance: objectId.instance,
               deviceId: device.deviceId
            }

            const formated: any = this._formatProperty(el);

            for (let key in formated) {
               obj[key] = formated[key];
            }

            return obj;
         });

      } catch (error) {
         throw error;
      }
   }

   public static async _getObjectDetailWithReadProperty(device: IDevice, objectId: IObjectId, argClient?: any): Promise<any> {

      const properties = [
         PropertyIds.PROP_OBJECT_NAME, PropertyIds.PROP_PRESENT_VALUE,
         PropertyIds.PROP_OBJECT_TYPE, PropertyIds.PROP_UNITS,
         PropertyIds.PROP_MAX_PRES_VALUE, PropertyIds.PROP_MIN_PRES_VALUE
      ]

      const obj = {
         objectId: objectId,
         id: objectId.instance,
         typeId: objectId.type,
         type: this._getObjectTypeByCode(objectId.type),
         instance: objectId.instance,
         deviceId: device.deviceId
      };

      while (properties.length > 0) {
         try {
            const property = properties.shift();
            if (typeof property !== "undefined") {
               console.log("property not undefined");
               const formated = await this._getPropertyValue(device.address, objectId, property, argClient);

               for (let key in formated) {
                  obj[key] = formated[key];
               }
            } else {
               console.log("property is undefined");
            }

         } catch (error) {
            console.error(error);
         }
      }


      return obj;

      // const requestArray = objects.map(el => ({
      //    objectId: JSON.parse(JSON.stringify(el)),
      //    properties: [
      //       { id: PropertyIds.PROP_OBJECT_NAME },
      //       { id: PropertyIds.PROP_PRESENT_VALUE },
      //       { id: PropertyIds.PROP_OBJECT_TYPE },
      //       { id: PropertyIds.PROP_UNITS },
      //       { id: PropertyIds.PROP_MAX_PRES_VALUE }, 
      //       { id: PropertyIds.PROP_MIN_PRES_VALUE }
      //    ]
      // }))

      // return new Promise((resolve, reject) => {
      //    client.readPropertyMultiple(device.address, requestArray, (err, data) => {
      //       if (err) {
      //          console.error(err)
      //          client.close()
      //          reject(err);
      //          return;
      //       }

      //       const dataFormated = data.values.map(el => {
      //          const formated: any = this._formatProperty(device.deviceId, el);

      //          if (typeof formated.units === "object") formated.units = "";
      //          else formated.units = this._getUnitsByCode(formated.units);
      //          return formated;
      //       })

      //       resolve(dataFormated);
      //    })
      // });
   }

   public static async _getChildrenNewValue(device: IDevice, children: Array<IObjectId>, argClient?: bacnet): Promise<Array<{ id: string | number; type: string | number; currentValue: any }>> {
      const client = argClient || new bacnet();
      const deviceAcceptSegmentation = [SEGMENTATIONS.SEGMENTATION_BOTH, SEGMENTATIONS.SEGMENTATION_TRANSMIT].indexOf(device.segmentation) !== -1;
      const func = deviceAcceptSegmentation ? this.getChildrenNewValueWithReadPropertyMultiple : this.getChildrenNewValueWithReadProperty;

      return func.call(this, device, children, client);
      // if (device.segmentation == SEGMENTATIONS.SEGMENTATION_BOTH || device.segmentation == SEGMENTATIONS.SEGMENTATION_TRANSMIT) {
      //    return this.getChildrenNewValueWithReadPropertyMultiple(device, children, client);
      // } else {
      //    return this.getChildrenNewValueWithReadProperty(device, children, client);
      // }

   }

   private static async getChildrenNewValueWithReadPropertyMultiple(device: IDevice, children: Array<IObjectId>, argClient?: bacnet): Promise<Array<{ id: string | number; type: string | number; currentValue: any }>> {

      try {
         const client = argClient || new bacnet();
         const requestArray = children.map(el => ({ objectId: el, properties: [{ id: PropertyIds.PROP_PRESENT_VALUE }] }));
         const data = await this.readPropertyMultiple(device.address, requestArray, client);
         const dataFormated = data.values.map(el => {
            const value = this._getObjValue(el.values[0].value);
            return {
               id: el.objectId.instance,
               type: el.objectId.type,
               currentValue: this._formatCurrentValue(value, el.objectId.type)
            }
         })

         return dataFormated;
      } catch (error) { }
   }

   private static async getChildrenNewValueWithReadProperty(device: IDevice, children: Array<IObjectId>, argClient?: bacnet): Promise<Array<{ id: string | number; type: string | number; currentValue: any }>> {
      const client = argClient || new bacnet();
      const res = [];

      try {
         const deep_children = [...children];
         while (deep_children.length > 0) {
            const obj = deep_children.shift();
            if (obj) {
               try {
                  obj["id"] = obj.instance;
                  const data = await this.readProperty(device.address, obj, PropertyIds.PROP_PRESENT_VALUE, client);
                  const value = data.values[0]?.value;
                  obj["currentValue"] = this._getObjValue(value);
                  res.push(obj);
               } catch (error) { }
            }
         }

         return res;
      } catch (error) {
         throw error;
      }
   }

   ////////////////////////////////////////////////////////////////
   ////                       Endpoints                          //
   ////////////////////////////////////////////////////////////////

   // Create a group for endpoints then call _createEndpointsByArray on the group created
   public static async createEndpointsInGroup(networkService: NetworkService, deviceId: string, groupName: string, endpointArray: any) {
      const endpointGroup = await this._createEndpointsGroup(networkService, deviceId, groupName);
      const groupId = endpointGroup.id.get();
      return this._createEndpointByArray(networkService, groupId, endpointArray);
   }

   public static async _createEndpointsGroup(networkService: NetworkService, deviceId: string, groupName: string) {
      //id of endpoint group , expected groupName to be like "analog-input" and such
      const networkId = ObjectTypes[`object_${groupName}`.toUpperCase()]

      const exist = await this._itemExistInChild(deviceId, SpinalBmsEndpointGroup.relationName, networkId);
      if (exist) return exist;

      const obj: any = {
         name: groupName,
         id: networkId,
         type: groupName,
         path: ""
      }
      const endpointGroup = await networkService.createNewBmsEndpointGroup(deviceId, obj);
      return endpointGroup;
   }

   public static async _createEndpointByArray(networkService: NetworkService, groupId: string, endpointArray: any) {
      const childNetwork = await this.getChildrenObj(groupId, SpinalBmsEndpoint.relationName);
      let counter = 0;
      while (counter < endpointArray.length) {
         const item = endpointArray[counter];
         if (childNetwork[item['object-identifier'].value]) {
            console.log(item['object-identifier'].value, "already exists");
            counter++;
            continue;
         }

         await this._createEndpoint(networkService, groupId, item);
         counter++;
      }
   }

   public static async _createEndpoint(networkService: NetworkService, groupId: string, endpointObj: any) {

      const obj: any = {
         id: endpointObj['object-identifier'].value,
         typeId: endpointObj['object-type'].value,
         name: endpointObj['object-name'].value,
         path: "",
         currentValue: endpointObj['present-value'].value,
         unit: endpointObj['units'].value,
         type: endpointObj['object-type'].value,
      }

      if (obj.name && typeof obj.name === "string" && obj.name.trim()) {
         console.log("creating", endpointObj.id);
         return networkService.createNewBmsEndpoint(groupId, obj);
      }

   }

   public static async _itemExistInChild(parentId: string, relationName: string, childNetworkId: string | number) {
      const children = await SpinalGraphService.getChildren(parentId, [relationName]);
      const found = children.find(el => el.idNetwork.get() == childNetworkId);

      return found;
   }


   //////////////////////////////////////////////////////////////////////
   ////                             OTHER UTILITIES                  ////
   //////////////////////////////////////////////////////////////////////


   public static async _getPropertyValue(address: string, objectId: IObjectId, propertyId: number | string, argClient?: bacnet): Promise<any> {

      try {
         const data = await this.readProperty(address, objectId, propertyId, argClient);
         const formated: any = this._formatProperty(data);
         return formated;

      } catch (error) {
         throw error;
      }
   }


   public static _formatProperty(object) {
      if (object) {
         const { values, property } = object;

         const obj: any = {};

         for (const { id, value } of values) {
            const argId = id || property?.id;
            const propertyName = this._getPropertyNameByCode(argId);

            if (propertyName) {
               obj[propertyName] = this._getObjValue(value);
            }
         }

         if (typeof obj.units !== "undefined") {
            if (typeof obj.units === "object") obj.units = "";
            else obj.units = this._getUnitsByCode(obj.units);
         }


         return obj;
      }

      return {}

   }

   public static _getObjValue(value: any) {
      if (typeof value !== "object") return value;

      let temp_value = Array.isArray(value) ? value[0]?.value : value.value;
      return typeof temp_value === "object" ? "" : temp_value;
   }

   public static _formatCurrentValue(value: any, type: number | string) {
      if ([ObjectTypes.OBJECT_BINARY_INPUT, ObjectTypes.OBJECT_BINARY_VALUE].indexOf(type) !== -1) {
         return value ? true : false;
      }
      return value;
   }

   public static _getPropertyNameByCode(type: number) {
      const property = PropertyNames[type];
      if (property) return property.toLocaleLowerCase().replace('prop_', '');
      return;
   }

   public static _getObjectTypeByCode(typeCode: number | string) {
      const property = ObjectTypesCode[typeCode];
      if (property) return property.toLocaleLowerCase().replace('object_', '');
      return;
   }

   public static _getUnitsByCode(typeCode: number): string {
      const property = UNITS_TYPES[typeCode];
      if (property) return property.toLocaleLowerCase().replace('units_', '').replace("_", " ");
      return;
   }

   private static async getChildrenObj(parentId: string, relationName: string): Promise<{ [key: string]: SpinalNodeRef }> {
      const children = await SpinalGraphService.getChildren(parentId, [relationName]);
      const obj = {};
      children.forEach(el => obj[el.idNetwork.get()] = el);

      return obj;
   }


   // public static _formatMultipleProperty(data: any) {
   //    return lodash.flattenDeep(data.map(object => {
   //       const { values } = object;

   //       return values.map(({ value }) => {
   //          return value
   //       })
   //    }))
   // }




}


export {
   BacnetUtilities
}