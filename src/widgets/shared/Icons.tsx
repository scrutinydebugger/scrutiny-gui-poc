import { DatastoreEntryType } from "../../utils/ScrutinyServer/datastore"

import "./icons.css"

export function EntryTypeIcon(props: { entryType: DatastoreEntryType }) {
    return <div className={`treeicon icon-${props.entryType}`} />
}
