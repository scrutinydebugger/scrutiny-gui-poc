import { createContext, useContext } from "react";

class WatcherHandler {
  nextWatcherId = 1;
  getNext() {
    return "" + this.nextWatcherId++;
  }
}

const WatcherContext = createContext({ handler: new WatcherHandler() });

export function useWatcher() {
  const { handler } = useContext(WatcherContext);
  return handler.getNext();
}
