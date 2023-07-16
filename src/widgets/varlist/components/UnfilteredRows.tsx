import { DatastoreEntryType } from "../../../utils/ScrutinyServer/datastore"
import { RootRow } from "./RootRow"

export function UnfilteredRows() {
    return (
        <>
            {Object.values(DatastoreEntryType).map((entryType) => (
                <RootRow key={entryType} entryType={entryType}></RootRow>
            ))}
        </>
    )
}
