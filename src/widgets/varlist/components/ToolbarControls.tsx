import { Button, Divider, InputGroup } from "@blueprintjs/core"
import { useCallback, useContext } from "react"
import { MosaicContext, MosaicWindowContext } from "react-mosaic-component"
import { useNestedState } from "../../shared/useNestedState"

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

    const [search, setSearch] = useNestedState("widget", "search", "")

    return (
        <>
            <InputGroup
                type="search"
                placeholder="search"
                leftIcon="search"
                value={search}
                onChange={(ev) => setSearch(ev.target.value)}
            ></InputGroup>
            <Divider></Divider>
            <Button icon="cross" minimal={true} onClick={closeWindow}></Button>
        </>
    )
}
