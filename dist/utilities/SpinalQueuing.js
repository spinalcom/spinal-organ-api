"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpinalQueuing = exports.Events = void 0;
const lodash = require("lodash");
const events_1 = require("events");
var Events;
(function (Events) {
    Events["FINISH"] = "finish";
    Events["START"] = "start";
})(Events = exports.Events || (exports.Events = {}));
class SpinalQueuing extends events_1.EventEmitter {
    constructor() {
        super();
        this.processed = [];
        this.queueList = [];
        this.percent = 0;
        this.isProcessing = false;
        this.debounceStart = lodash.debounce(this.begin, 3000);
    }
    addToQueue(obj) {
        this.queueList.push(obj);
        this.length = this.queueList.length;
        this.debounceStart();
        return this.length;
    }
    setQueue(queue) {
        this.queueList.push(...queue);
        this.length = this.queueList.length;
        this.debounceStart();
        return this.length;
    }
    dequeue() {
        const item = this.queueList.shift();
        if (this.queueList.length === 0)
            this.finish();
        else
            this.processed.push(item);
        this.percent = Math.floor((100 * this.processed.length) / this.length);
        return item;
    }
    refresh() {
        this.queueList = [];
    }
    getQueue() {
        return [...this.queueList];
    }
    isEmpty() {
        return this.queueList.length === 0;
    }
    begin() {
        if (!this.isProcessing) {
            this.isProcessing = true;
            this.emit(Events.START);
        }
    }
    finish() {
        if (this.isProcessing) {
            this.isProcessing = false;
            this.emit(Events.FINISH);
        }
    }
}
exports.SpinalQueuing = SpinalQueuing;
exports.default = SpinalQueuing;
//# sourceMappingURL=SpinalQueuing.js.map