import { ConnectDragSource } from "react-dnd";
import { DatastoreEntryType } from "../../utils/ScrutinyServer/datastore";

export function EntryTypeIcon(props: { entryType: DatastoreEntryType }) {
  return <div className={`treeicon icon-${props.entryType}`} />;
}

export function FolderTypeIcon() {
  return <div className="treeicon icon-folder"></div>;
}
export function DragIcon(props: { ref?: ConnectDragSource }) {
  return <div className="stt-dragger" ref={props.ref}></div>;
}
