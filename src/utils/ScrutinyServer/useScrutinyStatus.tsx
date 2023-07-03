import { useContext } from "react";
import { ScrutinyContext } from "./ScrutinyServer";

export function useScrutinyStatus() {
  const context = useContext(ScrutinyContext);
  if (!context)
    throw new Error(
      "please call useScrutinyStatus within a ScrutinyServer block"
    );
  return context.status;
}
