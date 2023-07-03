import {
  SerializableTileManagerData,
  TileManagerContextType,
} from "./TileManagerContext";
import { getMosaicTileIds } from "./mosaic-utils";
import { alterMosaic } from "./mosaic-utils";
import { ReduceTileManagerAction } from "./ReduceTileManagerAction";

/**
 * Reducer function used for the useTileManager hook
 */

export function reduceTileManager(
  state: TileManagerContextType,
  action: ReduceTileManagerAction
) {
  if (action && action.action)
    switch (action.action) {
      case "addNewTile": {
        const tileId = `${state.nextTileId}`;
        const nextTileId = state.nextTileId + 1;
        const newState = {
          ...state,
          nextTileId,
          tileData: {
            ...state.tileData,
            [tileId]: {
              type: action.tileType,
              state:
                state.tileTypes[action.tileType]?.initState?.(tileId) ?? {},
            },
          },
          mosaic: alterMosaic(
            state.mosaic,
            tileId,
            action.path,
            action.position
          ),
        };
        if (state.onChange) state.onChange(newState);
        return newState;
      }

      case "setMosaic": {
        // we need to go through the list of tileData and remove the ones that are not
        // refered to in the mosaic anymore
        const remainingTileIds = getMosaicTileIds(action.value);
        const tileData: TileManagerContextType["tileData"] = {};
        for (const tileId of remainingTileIds)
          tileData[tileId] = state.tileData[tileId];

        const newState = {
          ...state,
          mosaic: action.value,
          tileData,
        };

        if (state.onChange) state.onChange(newState);
        return newState;
      }

      case "updateTileState": {
        const newState = {
          ...state,
          tileData: {
            ...state.tileData,
            [action.tileId]: {
              ...state.tileData[action.tileId],
              state: action.newState,
            },
          },
        };

        if (state.onChange) state.onChange(newState);
        return newState;
      }

      case "loadFromSerialized":
        const data = JSON.parse(action.serialized);
        if ("nextTileId" in data && "mosaic" in data && "tileData" in data) {
          const { mosaic, nextTileId, tileData }: SerializableTileManagerData =
            data;

          const newState = { ...state, mosaic, nextTileId, tileData };
          if (state.onChange) state.onChange(newState);
          return newState;
        }
        throw new Error("Invalide serialized state");
    }
  throw new Error("invalid action");
}
