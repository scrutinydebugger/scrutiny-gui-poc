import { WatchEntryType } from "../types/WatchEntryType"
import { WatchFolderType } from "../types/WatchFolderType"
import { Button, Divider } from "@blueprintjs/core"
import { useCallback, useContext } from "react"
import { MosaicContext, MosaicWindowContext } from "react-mosaic-component"
import { useWidgetState } from "../../shared/BaseWidget"

export function ToolbarControls() {
    const {
        mosaicActions: { remove },
    } = useContext(MosaicContext)
    const {
        mosaicWindowActions: { getPath },
    } = useContext(MosaicWindowContext)

    const [entries, setEntries] = useWidgetState("entries", [] as Array<WatchEntryType | WatchFolderType | null>)

    const closeWindow = useCallback(() => {
        remove(getPath())
    }, [getPath, remove])

    const addNewFolder = useCallback(() => {
        setEntries([
            ...entries,
            {
                type: "folder",
                props: {
                    entries: [],
                    name: "New Folder",
                    isEditingLabel: true,
                },
            } as WatchFolderType,
        ])
    }, [entries, setEntries])

    return (
        <>
            <Button icon="folder-new" minimal={true} onClick={addNewFolder}></Button>
            <Divider></Divider>
            <Button icon="cross" minimal={true} onClick={closeWindow}></Button>
        </>
    )
}
