"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Monitor = void 0;
class Monitor {
    // constructor(model: any, callback: any) {
    constructor(model, networkService, spinalDevice, spinalModel, spinalNetwork) {
        this.monitorModel = model;
        this.networkService = networkService;
        this.spinalDevice = spinalDevice;
        this.spinalModel = spinalModel;
        this.spinalNetwork = spinalNetwork;
    }
    start() {
        var _a;
        if (isNaN(this.monitorModel.interval.get())) {
            // console.log("isNaN")
            this.stop();
            return;
        }
        ;
        this.timeSeriesProcess = (_a = this.spinalModel.saveTimeSeries) === null || _a === void 0 ? void 0 : _a.bind(() => {
            var _a, _b;
            console.log("timeSeries change", (_a = this.spinalModel.saveTimeSeries) === null || _a === void 0 ? void 0 : _a.get());
            this.networkService.useTimeseries = ((_b = this.spinalModel.saveTimeSeries) === null || _b === void 0 ? void 0 : _b.get()) || false;
        });
        this.monitoringProcess = this.monitorModel.monitoring.bind(() => {
            if (!this.monitorModel.monitoring.get()) {
                // console.log("!this.monitorModel.monitoring.get()")
                this.stop();
                return;
            }
            ;
            this.intervalProcess = this.monitorModel.interval.bind(() => {
                // console.log("inside interval bind")
                clearInterval(this.intervalId);
                this.intervalId = setInterval(() => {
                    const children = this.monitorModel.children.get();
                    this.spinalDevice.updateEndpoints(this.networkService, this.spinalNetwork, children);
                }, this.monitorModel.interval.get());
            });
        });
    }
    stop() {
        var _a;
        // console.log("stop")
        clearInterval(this.intervalId);
        this.monitorModel.monitoring.unbind(this.monitoringProcess);
        this.monitorModel.interval.unbind(this.intervalProcess);
        (_a = this.spinalModel.saveTimeSeries) === null || _a === void 0 ? void 0 : _a.unbind(this.timeSeriesProcess);
    }
}
exports.default = Monitor;
exports.Monitor = Monitor;
//# sourceMappingURL=Monitor.js.map