import { Button, Divider } from "@blueprintjs/core"
import { useCallback, useContext } from "react"
import { MosaicContext, MosaicWindowContext } from "react-mosaic-component"

export function ToolbarControls() {
    const {
        mosaicActions: { remove },
    } = useContext(MosaicContext)
    const {
        mosaicWindowActions: { getPath },
    } = useContext(MosaicWindowContext)

    const closeWindow = useCallback(() => {
        remove(getPath())
    }, [getPath, remove])

    return (
        <>
            <Divider></Divider>
            <Button icon="cross" minimal={true} onClick={closeWindow}></Button>
        </>
    )
}
