import { SpinalPilotModel } from "spinal-model-bacnet";
declare class SpinalPilot {
    private queue;
    private isProcessing;
    constructor();
    init(): void;
    addToPilotList(spinalPilotModel: SpinalPilotModel): Promise<void>;
    private pilot;
    private writeProperties;
    private writeProperty;
    private useDataType;
    private getDataTypes;
}
declare const spinalPilot: SpinalPilot;
export default spinalPilot;
export { spinalPilot };
