import { useTranslation } from "react-i18next"
import { DatastoreEntryType } from "../../../utils/ScrutinyServer/datastore"
import { EntryTypeContext } from "../useEntryType"
import { FolderRow } from "./FolderRow"
import { NestedStateFolder, NestedStateStore } from "../../shared/useNestedState"
import { useState } from "react"

export function RootRow(props: { entryType: DatastoreEntryType }) {
    const { t } = useTranslation("common")

    const [state, setState] = useState({})
    return (
        <NestedStateFolder name={["entryTypes", props.entryType]}>
            <NestedStateStore state={state} setState={setState} store="folders">
                <EntryTypeContext.Provider value={props.entryType}>
                    <FolderRow displayPath="/" folderName={t(`datastore.entry_type.${props.entryType}`) ?? props.entryType}></FolderRow>
                </EntryTypeContext.Provider>
            </NestedStateStore>
        </NestedStateFolder>
    )
}
