import * as lodash from "lodash";
import { EventEmitter } from "events";


export enum Events {
   FINISH = "finish",
   START = "start",
}

export class SpinalQueuing extends EventEmitter {

   private processed: Array<any> = [];
   private queueList: Array<any> = [];

   public percent: number = 0;
   private length: number;
   public isProcessing: boolean = false;

   private debounceStart = lodash.debounce(this.begin, 3000);

   constructor() {
      super();
   }

   public addToQueue(obj: any): number {
      this.queueList.push(obj);
      this.length = this.queueList.length;
      this.debounceStart();
      return this.length;
   }

   public setQueue(queue: any[]): number {
      this.queueList.push(...queue);
      this.length = this.queueList.length;
      this.debounceStart();
      return this.length;
   }

   public dequeue(): any {
      const item = this.queueList.shift();

      if (this.queueList.length === 0) this.finish();
      else this.processed.push(item);

      this.percent = Math.floor((100 * this.processed.length) / this.length);
      return item;
   }

   public refresh() {
      this.queueList = [];
   }

   public getQueue(): any[] {
      return [...this.queueList];
   }

   public isEmpty(): boolean {
      return this.queueList.length === 0;
   }


   private begin() {
      if (!this.isProcessing) {
         this.isProcessing = true;
         this.emit(Events.START)
      }
   }

   private finish() {
      if (this.isProcessing) {
         this.isProcessing = false;
         this.emit(Events.FINISH);
      }
   }
}

export default SpinalQueuing;