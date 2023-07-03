import React, {
  PropsWithChildren,
  useCallback,
  useMemo,
  useReducer,
} from "react";
import { reduceTileManager } from "./reduceTileManager";
import {
  SerializableTileManagerData,
  TileManagerContext,
  TileManagerContextType,
} from "./TileManagerContext";
import { TileTypesProvider } from "./TileRenderer";

export function TileManager(
  props: PropsWithChildren & {
    tileTypes: TileTypesProvider | [TileTypesProvider, any[]];
    value?: SerializableTileManagerData;
    onChange?: { (value: SerializableTileManagerData): void };
  }
): React.JSX.Element {
  const initialContext: TileManagerContextType = {
    mosaic: null,
    nextTileId: 1,
    tileData: {},
    ...props.value,
    onChange: props.onChange,
    // eslint-disable-next-line
    tileTypes: useMemo(
      typeof props.tileTypes === "function"
        ? props.tileTypes
        : props.tileTypes[0],
      typeof props.tileTypes === "function" ? [] : props.tileTypes[1]
    ),
  };

  const [context, dispatch] = useReducer(reduceTileManager, initialContext);

  const serialize = useCallback(() => {
    const { mosaic, nextTileId, tileData } = context;
    return JSON.stringify({ mosaic, nextTileId, tileData });
  }, [context]);

  return (
    <TileManagerContext.Provider value={[context, { dispatch, serialize }]}>
      {props.children}
    </TileManagerContext.Provider>
  );
}
