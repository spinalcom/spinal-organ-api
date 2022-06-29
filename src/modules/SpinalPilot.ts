import { SpinalQueuing } from "../utilities/SpinalQueuing";
import { SpinalPilotModel } from "spinal-model-bacnet";
import { IRequest } from "spinal-model-bacnet";
import { PropertyIds,ObjectTypes ,APPLICATION_TAGS } from "../utilities/GlobalVariables";

import * as bacnet from "bacstack";

class SpinalPilot {
   private queue: SpinalQueuing = new SpinalQueuing();
   private isProcessing: boolean = false;

   constructor() { }

   init() {
      this.queue.on("start", () => {
         console.log("start pilot...");
         this.pilot();
      })
   }

   public async addToPilotList(spinalPilotModel: SpinalPilotModel): Promise<void> {
      console.log("addToQueue");
      
      this.queue.addToQueue(spinalPilotModel);
   }

   private async pilot() {
      if (!this.isProcessing) {
         this.isProcessing = true;
         // console.log(this.queue);
         while (!this.queue.isEmpty()) {
            const pilot = this.queue.dequeue();

            if(pilot?.isNormal()) {
               pilot.setProcessMode();
               try {
                  await this.writeProperties(pilot?.requests.get())
                  console.log("success");
                  pilot.setSuccessMode();
                  await pilot.removeToNode();
               } catch (error) {
                  console.error(error.message);
                  pilot.setErrorMode();
                  await pilot.removeToNode();
               }
               
            } else {
               console.log("remove");
               await pilot.removeToNode();
            }
            
            // console.log("pilot",pilot)
         }
         
         this.isProcessing = false;
      }
   }

   private async writeProperties(requests: IRequest[] = []) {
      for (let index = 0; index < requests.length; index++) {
         const req = requests[index];
         try {
            await this.writeProperty(req);
         } catch (error) {            
            throw error;
         }
         
      }
   }

   private async writeProperty(req : IRequest) {
      const types = this.getDataTypes(req.objectId.type);
      let success = false;

      while (types.length > 0 && !success) {
         const type = types.shift();
         try {
            await this.useDataType(req, type);
            success = true;
         } catch (error) {
            // throw error;
         }
      }

      if(!success) {
         throw new Error("error");
      }
      
   }

   private useDataType(req: IRequest, dataType: number) {
      return new Promise((resolve, reject) => {
         const client = new bacnet();
         const value = dataType === APPLICATION_TAGS.BACNET_APPLICATION_TAG_ENUMERATED ? (req.value ? 1 : 0) : req.value;
         
         client.writeProperty(req.address,req.objectId,PropertyIds.PROP_PRESENT_VALUE, [{ type: dataType, value: value }],{ priority: 8 },(err,value) => {
               if (err) {
                  reject(err)
                  return;
               }
               resolve(value);
         })
      });
   }

   private getDataTypes(type: any): number[] {
      switch (type) {
         case ObjectTypes.OBJECT_ANALOG_INPUT:
         case ObjectTypes.OBJECT_ANALOG_OUTPUT:
         case ObjectTypes.OBJECT_ANALOG_VALUE:
         case ObjectTypes.OBJECT_MULTI_STATE_INPUT:
         case ObjectTypes.OBJECT_MULTI_STATE_OUTPUT:
         case ObjectTypes.OBJECT_MULTI_STATE_VALUE:
            return [
               APPLICATION_TAGS.BACNET_APPLICATION_TAG_UNSIGNED_INT,
               APPLICATION_TAGS.BACNET_APPLICATION_TAG_SIGNED_INT,
               APPLICATION_TAGS.BACNET_APPLICATION_TAG_REAL,
               APPLICATION_TAGS.BACNET_APPLICATION_TAG_DOUBLE
            ]
         
         case ObjectTypes.OBJECT_BINARY_INPUT:
         case ObjectTypes.OBJECT_BINARY_OUTPUT:
         case ObjectTypes.OBJECT_BINARY_VALUE:
         case ObjectTypes.OBJECT_BINARY_LIGHTING_OUTPUT:
            return [
               APPLICATION_TAGS.BACNET_APPLICATION_TAG_ENUMERATED,
               APPLICATION_TAGS.BACNET_APPLICATION_TAG_BOOLEAN
            ]
      
         default:
            return [
               APPLICATION_TAGS.BACNET_APPLICATION_TAG_OCTET_STRING,
               APPLICATION_TAGS.BACNET_APPLICATION_TAG_CHARACTER_STRING,
               APPLICATION_TAGS.BACNET_APPLICATION_TAG_BIT_STRING
            ]
      }
   }

   // private transformBacnetErrorToObj(error) {
   //    console.log(error);
      
   //    const message = error.message.match(/Code\:\d+/);
   //    console.log(message);
      
   //    // return message.replace("Code:",'')
      
      
   // }
}

const spinalPilot = new SpinalPilot();
spinalPilot.init();

export default spinalPilot;
export {
   spinalPilot
}