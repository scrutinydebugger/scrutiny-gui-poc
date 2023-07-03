import { useCallback, useContext } from "react";
import { EventManagerHandle } from "./EventManagerHandle";
import { EventManagerContext } from "./EventManagerContext";

export function useEventManager() {
  const { handler } = useContext(EventManagerContext);
  return {
    listen: useCallback(
      (eventName: string, handle: EventManagerHandle) => {
        return handler.listen(eventName, handle);
      },
      [handler]
    ),
    listenMany: useCallback(
      (events: [string, EventManagerHandle][]) => {
        return handler.listenMany(events);
      },
      [handler]
    ),
    trigger: useCallback(
      (eventName: string, data?: any) => {
        handler.trigger(eventName, data);
      },
      [handler]
    ),
  };
}
