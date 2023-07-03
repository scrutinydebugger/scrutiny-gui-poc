import React, { useCallback, useContext } from "react";
import { MosaicBranch } from "react-mosaic-component";
import { TileError } from "./TileError";
import { TileManagerContext } from "./TileManagerContext";
import { TileRenderContext } from "./TileRenderContext";

export function useTileManager() {
  const tileContext = useContext(TileManagerContext);
  if (tileContext === null) {
    throw new Error(
      "useTileManager must be used within a TileManager Component"
    );
  }
  const [{ mosaic, tileData, tileTypes }, { dispatch, serialize }] =
    tileContext;
  const renderTile = useCallback(
    function renderTile(tileId: string, path: MosaicBranch[]) {
      if (!(tileId in tileData))
        return (
          <TileError>
            Unknown tile ID {tileId}, not contained in current tileData
          </TileError>
        );
      const data = tileData[tileId];
      if (!(data.type in tileTypes))
        return (
          <TileError>
            Unknown tile type {data.type}, not contained in current tileTypes
          </TileError>
        );

      return (
        <TileRenderContext.Provider value={{ tileId }}>
          {tileTypes[data.type].render({
            state: data.state,
            setState: (newState: any) => {
              dispatch({ action: "updateTileState", tileId, newState });
            },
            tileId,
            path,
          })}
        </TileRenderContext.Provider>
      );
    },
    [tileData, tileTypes, dispatch]
  );

  const clearAll = useCallback(
    () => dispatch({ action: "setMosaic", value: null }),
    [dispatch]
  );

  return {
    mosaic,
    clearAll,
    renderTile,
    dispatch,
    serialize,
    _tileData: tileData,
  };
}
