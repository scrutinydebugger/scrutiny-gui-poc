import { PropsWithChildren } from "react";
import { EventManagerHandler } from "./EventManagerHandler";
import { EventManagerContext } from ".";

export function EventManager(props: PropsWithChildren) {
  return (
    <EventManagerContext.Provider
      value={{ handler: new EventManagerHandler() }}
    >
      {props.children}
    </EventManagerContext.Provider>
  );
}
