import { EntryTypeIcon } from "../../shared/Icons"
import { useDrag } from "react-dnd"
import { EntryRowIndent } from "../../shared/EntryRowIndent"
import { DatastoreEntryType } from "../../../utils/ScrutinyServer/datastore"
import { WatchEntryType } from "../../watch/WatchEntryType"
import { useRenderedTileId } from "../../../utils/TileManager/useRenderedTileId"

export function EntryRow(props: {
    entryType: DatastoreEntryType
    displayPath: string
    displayName?: string | JSX.Element
    dataType?: string
}) {
    const tileId = useRenderedTileId()
    const [, drag] = useDrag(() => ({
        type: "scrutiny.entry",
        item: () =>
            ({
                type: "entry",
                fromLocation: {
                    tileId,
                },
                props: {
                    entry_type: props.entryType,
                    display_path: props.displayPath,
                },
            } as WatchEntryType),
    }))

    return (
        <tr ref={drag}>
            <td>
                <EntryRowIndent></EntryRowIndent>
                <EntryTypeIcon entryType={props.entryType}></EntryTypeIcon>
                {props.displayName ?? props.displayPath}
            </td>
            <td>{props.dataType ?? ""}</td>
        </tr>
    )
}
