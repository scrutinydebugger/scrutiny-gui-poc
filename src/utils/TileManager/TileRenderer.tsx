import { MosaicBranch } from "react-mosaic-component";

export interface TileRendererProps<State = any, InitialState = Partial<State>> {
  tileId: string;
  path: MosaicBranch[];
  state: InitialState;
  setState: { (newState: State): void };
}

export interface TileRenderer<T = any> {
  (props: TileRendererProps<T>): React.JSX.Element;
}

export interface TileTypesProvider {
  (): TileTypes;
}

export interface TileTypes {
  [key: string]: TileType;
}

export interface TileType {
  render: TileRenderer<any>;
  initState?: { (tileId: string): any };
}

export function defineNewTileManagerRenderer<State, InitialState = State>(
  render: {
    (props: TileRendererProps<State, InitialState>): React.JSX.Element;
  },
  initState?: { (): InitialState }
): TileType {
  return { render, initState } as TileType;
}
