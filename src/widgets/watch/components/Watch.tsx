import { useDrop } from "react-dnd"
import { WatchEntryType } from "../types/WatchEntryType"
import { WatchFolderType } from "../types/WatchFolderType"
import { WatchEntries } from "./WatchEntries"
import { useRenderedTileId } from "../../../utils/TileManager/useRenderedTileId"
import { useCallback, useEffect } from "react"
import { onKeyDown } from "../hooks/onKeyDown"
import { walkObject } from "../../../utils/walkObject"
import { useWidgetState } from "../../shared/BaseWidget"

export function Watch() {
    const [entries, setEntries, dispatchWidgetState, entriesNestedStatePath] = useWidgetState(
        "entries",
        [] as Array<WatchEntryType | WatchFolderType | null>
    )

    const [selectedRow, setSelectedRow] = useWidgetState<null | string>("selectedEntry", null)

    const selectNextOrPrev = useCallback(
        (offset: number) => {
            if (!selectedRow) return
            const keys = selectedRow.split("/")
            do {
                const last = keys.pop()
                const result: string | null = walkObject({ entries }, keys, ({ isLast, value, $return }) => {
                    // go over this last part manually, and see if there's another one after.
                    // Otherewise, move to the higher part of the path
                    if (isLast) {
                        const options = Object.keys(value)
                        for (let i = 0; i < options.length; i++) {
                            if (options[i] === last) {
                                const candidate = i + offset
                                if (candidate in options) {
                                    return $return([...keys, candidate].join("/"))
                                } else if (offset === -1) {
                                    // going up, we can safely select the parent folder
                                    // removes entries
                                    keys.pop()
                                    // removes props
                                    keys.pop()
                                    return $return(keys.join("/"))
                                } else if (value[last].type === "folder" && value[last].props.entries.length > 0) {
                                    // going down, see if the one we have has entries
                                    return $return([...keys, last, "props", "entries", 0].join("/"))
                                }
                                return $return(null)
                            }
                        }
                    }
                })
                if (result !== null && result) {
                    setSelectedRow(result)
                    return
                }
            } while (keys.length)
        },
        [selectedRow, setSelectedRow, entries]
    )

    useEffect(() => {
        if (!selectedRow) return
        return onKeyDown(["ArrowUp", "ArrowDown"], (ev) => {
            if (ev.key === "ArrowUp") selectNextOrPrev(-1)
            else if (ev.key === "ArrowDown") selectNextOrPrev(+1)
        })
    }, [selectNextOrPrev, selectedRow, entries])

    const tileId = useRenderedTileId()
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
                        action: "moved",
                    }
                }

                setEntries([...entries, item])
                return { action: "inserted" }
            },
            collect(monitor) {
                return {
                    isOver: monitor.isOver({ shallow: true }),
                }
            },
        }),
        [entries, setEntries]
    )
    return (
        <div
            className="varlist-content"
            ref={drop}
            style={{
                height: "100%",
                ...(isOver ? { backgroundColor: "gainsboro" } : {}),
            }}
        >
            <div className="varlist-tree-container">
                <table className="watch-table" style={{ width: "100%" }}>
                    <thead>
                        <tr>
                            <th></th>
                            <th style={{ width: "160px" }}>Value</th>
                            <th style={{ width: "50px" }}>Type</th>
                            <th style={{ width: "50px" }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        <WatchEntries entries={entries}></WatchEntries>
                    </tbody>
                </table>
            </div>
        </div>
    )
}
