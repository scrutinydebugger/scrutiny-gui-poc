import { NestedStatePath } from "../shared/useNestedState";

export interface WatchEntryLocation {
  tileId: string;
  nestedStatePath?: NestedStatePath;
}
