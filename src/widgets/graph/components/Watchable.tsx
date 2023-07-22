import { Button, InputGroup, Tooltip } from "@blueprintjs/core"
import { useDrop } from "react-dnd"
import { WatchEntryType } from "../../watch/types/WatchEntryType"
import { EntryTypeIcon } from "../../shared/Icons"
import { DatastoreEntryType } from "../../../utils/ScrutinyServer/datastore"

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
    const [{ isOver }, drop] = useDrop(
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
                readOnly={props.allowConstant !== true}
                style={isOver ? { backgroundColor: "gainsboro" } : {}}
            ></InputGroup>
            {typeof value === "object" && value && "entry_type" in value && (
                <div
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
                        <EntryTypeIcon entryType={value.entry_type} />
                    </div>
                    <Tooltip content={value.display_path}>{value.label}</Tooltip>

                    <Button
                        style={{ position: "absolute", right: 0 }}
                        small={true}
                        minimal={true}
                        icon="cross"
                        onClick={() => onChange("")}
                    ></Button>
                </div>
            )}
        </div>
    )
}
