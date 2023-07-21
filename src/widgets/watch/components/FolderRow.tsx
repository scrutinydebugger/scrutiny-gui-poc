import { NestedStateFolder, useNestedStatePath } from "../../shared/useNestedState"
import { Editable } from "./Editable"
import { WatchFolderType } from "../types/WatchFolderType"
import { RowWithChildren } from "../../shared/RowWithChildren"
import { WatchEntries } from "./WatchEntries"
import { ConnectableElement, useDrag, useDrop } from "react-dnd"
import { WatchEntryType } from "../types/WatchEntryType"
import { useRenderedTileId } from "../../../utils/TileManager/useRenderedTileId"
import { useCallback, useEffect } from "react"
import { Button, Icon } from "@blueprintjs/core"
import { useIndent } from "../../shared/Indent"
import { onKeyDown } from "../hooks/onKeyDown"
import { useWidgetState } from "../../shared/BaseWidget"

export function FolderRow(props: {
    removeEntry: {
        (...replaceWith: Array<WatchEntryType | WatchFolderType>): void
    }
}) {
    const { removeEntry } = props
    const [name, setName] = useWidgetState("props/name", "--")
    const [showChildren, setShowChildren] = useWidgetState("props/isOpen", false)
    const [, setIsEditingLabel] = useWidgetState("props/isEditingLabel", false)
    const [selectedRow, setSelectedRow] = useWidgetState<null | string>("selectedEntry", null, { absolutePath: true })
    const [entries, setEntries, dispatchWidgetState, entriesNestedStatePath] = useWidgetState(
        "props/entries",
        [] as Array<WatchFolderType | WatchEntryType>
    )
    const folderNestedPath = useNestedStatePath()
    const tileId = useRenderedTileId()
    const myRowPath = folderNestedPath.join("/")
    const isSelected = selectedRow === myRowPath

    useEffect(() => {
        if (!isSelected) return
        return onKeyDown(["F2", "Backspace", "Delete"], (ev) => {
            switch (ev.key) {
                case "F2":
                    setIsEditingLabel(true)
                    break
                case "Backspace":
                case "Delete":
                    removeEntry()
                    break
            }
        })
    }, [isSelected, setIsEditingLabel, removeEntry])

    const [{ isOver }, drop] = useDrop(
        () => ({
            accept: ["scrutiny.entry", "scrutiny.folder"],
            drop(item: WatchEntryType | WatchFolderType, monitor) {
                if (monitor.didDrop()) return
                if (tileId === item.fromLocation?.tileId && item.fromLocation?.nestedStatePath) {
                    dispatchWidgetState({
                        action: "move",
                        source: item.fromLocation.nestedStatePath,
                        destination: {
                            path: entriesNestedStatePath,
                            location: "append",
                        },
                    })
                    return {
                        action: "move",
                    }
                }
                setEntries([...entries, item])
                setShowChildren(true)
                return { action: "inserted" }
            },

            collect(monitor) {
                return {
                    isOver: monitor.isOver(),
                }
            },
        }),
        [entries, setEntries]
    )
    const [, drag] = useDrag(
        () => ({
            type: "scrutiny.entry",
            item: () =>
                ({
                    type: "folder",
                    fromLocation: {
                        tileId,
                        nestedStatePath: folderNestedPath,
                    },
                    props: {
                        name,
                        entries,
                    },
                } as WatchFolderType),
        }),
        [tileId, removeEntry, name, entries]
    )
    const ref = useCallback(
        (el: ConnectableElement) => {
            drop(el)
            drag(el)
        },
        [drag, drop]
    )
    const indent = useIndent()
    const trStyle = isOver ? { backgroundColor: "gainsboro" } : isSelected ? { backgroundColor: "lightgreen" } : {}
    return (
        <RowWithChildren
            showChildrenWidgetStateKey="props/isOpen"
            row={() => (
                <tr ref={ref} style={trStyle}>
                    <td
                        style={{ paddingLeft: 2 + indent + "px" }}
                        onClick={() => {
                            if (isSelected) setSelectedRow(null)
                            else setSelectedRow(myRowPath)
                        }}
                    >
                        <Icon
                            onClick={(ev) => {
                                setShowChildren(!showChildren)
                                ev.stopPropagation()
                            }}
                            icon={showChildren ? "folder-open" : "folder-close"}
                        ></Icon>{" "}
                        <Editable nestedStateKey="props/isEditingLabel" value={name} onChange={setName}></Editable>
                    </td>
                    <td></td>
                    <td></td>
                    <td className="watch-actions-column">
                        <Button icon="cross" minimal={true} small={true} onClick={() => removeEntry()} className="remove-button"></Button>
                    </td>
                </tr>
            )}
            children={() => (
                <NestedStateFolder name="props">
                    <WatchEntries entries={entries}></WatchEntries>
                </NestedStateFolder>
            )}
        ></RowWithChildren>
    )
}
