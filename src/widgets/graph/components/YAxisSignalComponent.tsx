import { Editable } from "../../watch/components/Editable"
import { useWidgetState } from "../../shared/BaseWidget"
import { EntryTypeIcon } from "../../shared/Icons"
import { DatastoreEntryType } from "../../../utils/ScrutinyServer/datastore"
import { Button, Tooltip } from "@blueprintjs/core"
import { useDrag } from "react-dnd"
import { WatchEntryType } from "../../watch/types/WatchEntryType"
import { useRenderedTileId } from "../../../utils/TileManager/useRenderedTileId"
import { useNestedStatePath } from "../../shared/useNestedState"

export function YAxisSignalComponent(props: { removeEntry: { (): void } }) {
    const [label, setLabel] = useWidgetState("label", "")
    const [entry_type] = useWidgetState("entry_type", "")
    const [display_path] = useWidgetState("display_path", "")
    const tileId = useRenderedTileId()
    const nestedStatePath = useNestedStatePath()
    const [, drag] = useDrag(
        () => ({
            type: "scrutiny.entry",
            item: () =>
                ({
                    type: "entry",
                    fromLocation: {
                        tileId,
                        nestedStatePath,
                    },
                    props: {
                        entry_type,
                        display_path,
                        name: label,
                    },
                } as WatchEntryType),
        }),
        [tileId, entry_type, display_path, label]
    )
    return (
        <tr ref={drag}>
            <td style={{ paddingLeft: "10px" }}>
                <EntryTypeIcon entryType={entry_type as DatastoreEntryType}></EntryTypeIcon>
                <Tooltip content={display_path}>
                    <Editable value={label} onChange={setLabel}></Editable>
                </Tooltip>
            </td>
            <td>
                <Button minimal={true} small={true} onClick={props.removeEntry} icon="cross"></Button>
            </td>
        </tr>
    )
}
