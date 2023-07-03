import { MosaicNode, MosaicPath } from "react-mosaic-component";
import { MosaicDropTargetPosition } from "react-mosaic-component/lib/internalTypes";

export interface ActionAddNewTile {
  action: "addNewTile";
  tileType: string;
  path: MosaicPath;
  position: MosaicDropTargetPosition;
}

export interface ActionSetMosaic {
  action: "setMosaic";
  value: MosaicNode<string> | null;
}

export interface ActionUpdateTileState {
  action: "updateTileState";
  tileId: string;
  newState: any;
}
export interface ActionLoadFromSerializedState {
  action: "loadFromSerialized";
  serialized: string;
}

export type ReduceTileManagerAction =
  | ActionAddNewTile
  | ActionSetMosaic
  | ActionUpdateTileState
  | ActionLoadFromSerializedState;
