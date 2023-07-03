import { EventManagerHandle } from "./EventManagerHandle";

/**
 * Event manager, allows to listen and triggers event.
 * Does not
 */

export class EventManagerHandler {
  protected deepCopyForEachHandle: boolean;
  constructor(opts?: { deepCopyForEachHandle?: boolean }) {
    this.deepCopyForEachHandle = opts?.deepCopyForEachHandle ?? false;
  }

  protected events: { [key: string]: Array<EventManagerHandle> } = {};
  listen(eventName: string, handle: EventManagerHandle): { (): void } {
    if (!(eventName in this.events)) this.events[eventName] = [];
    this.events[eventName].push(handle);
    return () => {
      this.quiet(eventName, handle);
    };
  }

  listenMany(events: [string, EventManagerHandle][]): { (): void } {
    const quiets = events.map(([eventName, handle]) =>
      this.listen(eventName, handle)
    );
    return () => {
      quiets.forEach((quiet) => quiet());
    };
  }

  quiet(eventName: string, handle: EventManagerHandle) {
    if (eventName in this.events) {
      const idx = this.events[eventName].findIndex((h) => h === handle);
      if (idx >= 0) this.events[eventName].splice(idx, 1);
    }
  }

  trigger(eventName: string, data?: any) {
    // console.debug("EventManagerHandler trigger", eventName, data);
    let getData: { (): any };
    if (this.deepCopyForEachHandle) {
      const serialized = JSON.stringify(data);
      getData = () => JSON.parse(serialized);
    } else {
      getData = () => data;
    }

    if (eventName in this.events)
      this.events[eventName].forEach((handle) => handle(getData()));
  }
}
