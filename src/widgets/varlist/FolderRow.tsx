import { useDrag } from "react-dnd";
import { RowWithChildren } from "../shared/RowWithChildren";
import { useNestedState, NestedStateFolder } from "../shared/useNestedState";
import { WatchFolderType } from "../watch/WatchFolderType";
import { useEntryType } from "./useEntryType";
import { useFolderChildren } from "./useFolderChildren";
import { displayPathToFolderName } from "../shared/displayPathToFolderName";
import { EntryRow } from "./EntryRow";
import {
  Datastore,
  DatastoreEntryType,
} from "../../utils/ScrutinyServer/datastore";
import { WatchEntryType } from "../watch/WatchEntryType";
import { useScrutinyDatastore } from "../../utils/ScrutinyServer";
import { useRenderedTileId } from "../../utils/TileManager/useRenderedTileId";
import { Icon } from "@blueprintjs/core";
import { useIndent } from "../shared/Indent";

function getWatchFolder(
  datastore: Datastore,
  entryType: DatastoreEntryType,
  displayPath: string,
  tileId: string,
  name?: string
): WatchFolderType {
  const { entries, subfolders } = datastore.get_children(
    entryType,
    displayPath
  );

  return {
    type: "folder",
    fromLocation: { tileId },
    props: {
      name: name ?? displayPathToFolderName(displayPath),
      isOpen: true,
      entries: [
        ...entries[entryType].map(
          (entry) =>
            ({
              type: "entry",
              fromLocation: { tileId },
              props: {
                display_path: entry.display_path,
                entry_type: entry.entry_type,
                name: displayPathToFolderName(entry.display_path),
              },
            } as WatchEntryType)
        ),
        ...subfolders.map((subfolder) =>
          getWatchFolder(datastore, entryType, subfolder.display_path, tileId)
        ),
      ],
    },
  };
}

export function FolderRow({
  displayPath,
  folderName: overwriteFolderName,
}: {
  displayPath: string;
  folderName?: string;
}) {
  const folderName =
    overwriteFolderName ?? displayPathToFolderName(displayPath);
  const namespace = ["files", folderName];
  const [isOpen, setIsOpen] = useNestedState(
    "widget",
    [...namespace, "showChildren"],
    false
  );
  const entryType = useEntryType();
  const tileId = useRenderedTileId();

  const { entries, subfolders } = useFolderChildren(displayPath);
  const datastore = useScrutinyDatastore();
  const [, drag] = useDrag(() => {
    return {
      type: "scrutiny.folder",
      item: () => {
        return getWatchFolder(
          datastore,
          entryType,
          displayPath,
          tileId,
          folderName
        );
      },
    };
  }, [datastore, entryType, displayPath]);
  const indent = useIndent();
  return (
    <NestedStateFolder name={namespace}>
      <RowWithChildren
        row={() => (
          <tr ref={drag}>
            <td
              style={{ paddingLeft: 2 + indent + "px" }}
              onClick={() => setIsOpen(!isOpen)}
            >
              <Icon icon={isOpen ? "folder-open" : "folder-close"}></Icon>{" "}
              {folderName}
            </td>
            <td></td>
          </tr>
        )}
        children={() => (
          <>
            {subfolders.map((child) => (
              <FolderRow
                displayPath={child.display_path}
                key={child.display_path}
              ></FolderRow>
            ))}
            {entries.map((child) => (
              <EntryRow entry={child} key={child.display_path}></EntryRow>
            ))}
          </>
        )}
      ></RowWithChildren>
    </NestedStateFolder>
  );
}
