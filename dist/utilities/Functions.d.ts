import { SpinalDisoverModel, SpinalListenerModel, SpinalOrganConfigModel, SpinalBacnetValueModel, SpinalPilotModel, SpinalApiDiscoverModel } from "spinal-model-bacnet";
export declare const connectionErrorCallback: (err?: any) => never;
export declare const CreateOrganConfigFile: (spinalConnection: any, path: string, connectorName: string) => Promise<unknown>;
export declare const GetPm2Instance: (organName: string) => Promise<unknown>;
export declare const SpinalDiscoverCallback: (spinalDisoverModel: SpinalDisoverModel | SpinalApiDiscoverModel, organModel: SpinalOrganConfigModel) => Promise<boolean>;
export declare const SpinalBacnetValueModelCallback: (spinalBacnetValueModel: SpinalBacnetValueModel, organModel: SpinalOrganConfigModel) => Promise<void>;
export declare const SpinalListnerCallback: (spinalListenerModel: SpinalListenerModel, organModel: SpinalOrganConfigModel) => Promise<void>;
export declare const SpinalPilotCallback: (spinalPilotModel: SpinalPilotModel, organModel: SpinalOrganConfigModel) => Promise<void>;
