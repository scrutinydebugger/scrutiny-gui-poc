import { EntryTypeIcon } from "../../shared/Icons"
import { EntryRowIndent } from "../../shared/EntryRowIndent"

import { DatastoreEntryType } from "../../../utils/ScrutinyServer/datastore"
import { useNestedStatePath } from "../../shared/useNestedState"
import { Editable } from "./Editable"
import { WatchEntryType } from "../types/WatchEntryType"
import { WatchFolderType } from "../types/WatchFolderType"
import { ConnectableElement, useDrag, useDrop } from "react-dnd"
import { useRenderedTileId } from "../../../utils/TileManager/useRenderedTileId"
import { useCallback, useEffect } from "react"
import { Button, Tooltip } from "@blueprintjs/core"
import { useScrutinyValue } from "../../../utils/ScrutinyServer/useScrutinyValue"
import { onKeyDown } from "../hooks/onKeyDown"
import { useScrutinyDatastoreEntry } from "../../../utils/ScrutinyServer/useScrutinyDatastoreEntry"
import { useWidgetState } from "../../shared/BaseWidget"

function Value(props: { entry_type: DatastoreEntryType; display_path: string }) {
    const { entry_type, display_path } = props
    const [value, setValue, entry] = useScrutinyValue({
        entry_type,
        display_path,
    })
    return (
        <>
            {!entry || typeof value === "undefined" ? (
                <>N/A</>
            ) : (
                <Editable
                    nestedStateKey="props/isEditingValue"
                    value={formatValue(value)}
                    onChange={(newValue) => {
                        setValue(transformValue(value, newValue))
                    }}
                ></Editable>
            )}
        </>
    )
}

export function EntryRow(props: {
    entry_type: DatastoreEntryType
    display_path: string
    removeEntry: {
        (...replaceWith: Array<WatchEntryType | WatchFolderType>): void
    }
    addEntry: { (entry: WatchEntryType | WatchFolderType): void }
}) {
    const { entry_type, display_path, addEntry, removeEntry } = props
    const entry = useScrutinyDatastoreEntry({
        entry_type,
        display_path,
    })
    const [name, setName, dispatchWidgetState] = useWidgetState("props/name", display_path, {
        clearOnDefault: true,
    })
    const [selectedRow, setSelectedRow] = useWidgetState<null | string>("selectedEntry", null, { absolutePath: true })
    const tileId = useRenderedTileId()
    const nestedStatePath = useNestedStatePath()
    const myRowPath = nestedStatePath.join("/")
    const isSelected = selectedRow === myRowPath
    const [{ isOver }, drop] = useDrop(
        () => ({
            accept: ["scrutiny.folder", "scrutiny.entry"],
            drop(item: WatchEntryType | WatchFolderType, monitor) {
                if (monitor.didDrop()) return
                if (tileId === item.fromLocation?.tileId && item.fromLocation?.nestedStatePath) {
                    dispatchWidgetState({
                        action: "move",
                        source: item.fromLocation.nestedStatePath,
                        destination: {
                            path: nestedStatePath,
                            location: "after",
                        },
                    })
                    return {
                        action: "moved",
                    }
                }
                addEntry(item)
                return { action: "inserted" }
            },
            collect(monitor) {
                return {
                    isOver: monitor.isOver(),
                }
            },
        }),
        [addEntry]
    )
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
                        name,
                    },
                } as WatchEntryType),
        }),
        [tileId, removeEntry, entry_type, display_path, name]
    )
    const ref = useCallback(
        (el: ConnectableElement) => {
            drop(el)
            drag(el)
        },
        [drag, drop]
    )
    const [isEditingValue, setIsEditingValue] = useWidgetState("props/isEditingValue", false)
    const [, setIsEditingLabel] = useWidgetState("props/isEditingLabel", false)

    useEffect(() => {
        if (!isSelected) return
        return onKeyDown(
            ["Enter", "F2", "Backspace", "Delete"],
            (ev) => {
                switch (ev.key) {
                    case "Enter":
                        setIsEditingValue(true)
                        break
                    case "F2":
                        setIsEditingLabel(true)
                        break
                    case "Backspace":
                    case "Delete":
                        removeEntry()
                        break
                }
            },
            "keypress"
        )
    }, [isSelected, setIsEditingLabel, setIsEditingValue, removeEntry])

    const tdStyle: Record<string, string> = isOver ? { borderBottom: "2px solid red" } : {}

    if (entry === null) {
        // entry not available
        tdStyle["backgroundCcleolor"] = "lightgray"
        tdStyle["opacity"] = ".75"
    }
    const trStyle = isSelected ? { backgroundColor: "lightgreen" } : {}
    return (
        <tr
            ref={ref}
            style={trStyle}
            onClick={() => {
                if (isSelected) setSelectedRow(null)
                else setSelectedRow(myRowPath)
            }}
        >
            <td>
                <EntryRowIndent></EntryRowIndent>
                <EntryTypeIcon entryType={props.entry_type}></EntryTypeIcon>
                <Tooltip content={display_path}>
                    <Editable nestedStateKey="props/isEditingLabel" value={name} onChange={setName}></Editable>
                </Tooltip>
            </td>

            <td
                style={tdStyle}
                onDoubleClick={() => {
                    if (!isEditingValue) setIsEditingValue(true)
                }}
            >
                <Value display_path={display_path} entry_type={entry_type}></Value>
            </td>
            <td style={tdStyle}>{entry?.datatype}</td>
            <td className="watch-actions-column" style={tdStyle}>
                <Button icon="cross" minimal={true} small={true} onClick={() => props.removeEntry()} className="remove-button"></Button>
            </td>
        </tr>
    )
}

function transformValue(oldValue: any, newValue: string): number {
    switch (newValue.toLowerCase()) {
        case "true":
            return 1
        case "false":
            return 0
        default:
            return newValue as unknown as number
    }
}

function formatValue(val: any): string {
    if (typeof val === "boolean") return val ? "true" : "false"
    else if (typeof val === "undefined") return "N/A"
    return `${val}`
}
