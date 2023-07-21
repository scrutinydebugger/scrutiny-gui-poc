import { WatchEntryLocation } from "./WatchEntryLocation";
import { WatchEntryType } from "./WatchEntryType";

export type WatchFolderType = {
  type: "folder";
  fromLocation?: WatchEntryLocation;
  props: {
    name: string;
    isOpen?: boolean;
    isEditingLabel?: boolean;
    entries: Array<WatchEntryType | WatchFolderType>;
  };
};
