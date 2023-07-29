import { Button, InputGroup, Tooltip } from "@blueprintjs/core"
import { useDrag, useDrop, DndContext } from "react-dnd"
import { WatchEntryType } from "../../watch/types/WatchEntryType"
import { EntryTypeIcon } from "../../shared/Icons"
import { DatastoreEntryType } from "../../../utils/ScrutinyServer/datastore"
import { useRenderedTileId } from "../../../utils/TileManager/useRenderedTileId"
import { useNestedStatePath } from "../../shared/useNestedState"
import { useContext } from "react"

export interface WatchableType {
    display_path: string
    entry_type: DatastoreEntryType
    label: string
}

export function Watchable(props: {
    value: string | WatchableType
    onChange: { (value: string | WatchableType): void }
    allowConstant?: boolean
}) {
    const { value, onChange } = props
    const [{ isOver, canDrop }, drop] = useDrop(
        () => ({
            accept: ["scrutiny.entry"],
            drop(item: WatchEntryType, monitor) {
                if (monitor.didDrop()) return
                const { display_path, entry_type, name } = item.props
                onChange({
                    display_path,
                    entry_type,
                    label: name ?? display_path.substring(display_path.lastIndexOf("/") + 1),
                })
                return { action: "used" }
            },
            collect(monitor) {
                return {
                    isOver: monitor.isOver(),
                    canDrop: monitor.canDrop(),
                }
            },
        }),
        [onChange]
    )
    return (
        <div ref={drop} style={{ position: "relative" }} className="watch-table">
            <InputGroup
                type="text"
                value={typeof value === "string" ? value : ""}
                onChange={(ev) => onChange(ev.target.value)}
                style={isOver ? { backgroundColor: "gainsboro" } : canDrop ? { backgroundColor: "gray" } : {}}
            ></InputGroup>
            {typeof value === "object" && value && "entry_type" in value && <Potato value={value} clearValue={() => onChange("")}></Potato>}
        </div>
    )
}

function Potato({ value: { entry_type, display_path, label }, clearValue }: { value: WatchableType; clearValue: { (): void } }) {
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
                        entry_type: entry_type,
                        display_path: display_path,
                        name: label,
                    },
                } as WatchEntryType),
        }),
        [tileId, entry_type, display_path, label]
    )

    return (
        <div
            ref={drag}
            style={{
                position: "absolute",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                padding: "5px",
            }}
        >
            <div style={{ marginTop: "3px", display: "inline-block" }}>
                <EntryTypeIcon entryType={entry_type} />
            </div>
            <Tooltip content={display_path}>{label}</Tooltip>

            <Button style={{ position: "absolute", right: 0 }} small={true} minimal={true} icon="cross" onClick={clearValue}></Button>
        </div>
    )
}
