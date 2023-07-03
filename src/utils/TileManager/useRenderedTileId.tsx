import { useContext } from "react";
import { TileRenderContext } from "./TileRenderContext";

export function useRenderedTileId() {
  const { tileId } = useContext(TileRenderContext);
  if (tileId === null)
    throw new Error(
      "useRenderedTileId must be used within a TileRenderContext"
    );

  return tileId;
}
