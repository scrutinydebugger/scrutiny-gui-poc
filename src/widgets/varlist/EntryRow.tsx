import { EntryTypeIcon } from "../shared/Icons";
import { useDrag } from "react-dnd";
import { EntryRowIndent } from "../shared/EntryRowIndent";
import { DatastoreEntryWithName } from "../../utils/ScrutinyServer/datastore";
import { WatchEntryType } from "../watch/WatchEntryType";
import { useRenderedTileId } from "../../utils/TileManager/useRenderedTileId";

export function EntryRow(props: { entry: DatastoreEntryWithName }) {
  const tileId = useRenderedTileId();
  const [, drag] = useDrag(() => ({
    type: "scrutiny.entry",
    item: () =>
      ({
        type: "entry",
        fromLocation: {
          tileId,
        },
        props: {
          entry_type: props.entry.entry_type,
          display_path: props.entry.display_path,
        },
      } as WatchEntryType),
  }));

  return (
    <tr ref={drag}>
      <td>
        <EntryRowIndent></EntryRowIndent>
        <EntryTypeIcon entryType={props.entry.entry_type}></EntryTypeIcon>
        {props.entry.default_name}
      </td>
      <td>{props.entry.datatype}</td>
    </tr>
  );
}
