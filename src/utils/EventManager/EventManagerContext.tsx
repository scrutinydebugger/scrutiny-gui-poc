import { createContext } from "react";
import { EventManagerHandler } from "./EventManagerHandler";
import { EventManagerContextInterface } from "./EventManagerContextInterface";

export const EventManagerContext = createContext<EventManagerContextInterface>({
  handler: new EventManagerHandler(),
});
