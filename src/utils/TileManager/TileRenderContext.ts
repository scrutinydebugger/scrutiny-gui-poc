import { createContext } from "react";

export const TileRenderContext = createContext<{ tileId: null | string }>({
  tileId: null,
});
