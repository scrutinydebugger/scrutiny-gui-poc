import { MosaicWindow, MosaicWindowProps } from "react-mosaic-component"
import { PropsWithChildren } from "react"
import { TileRendererProps } from "../../utils/TileManager/TileRenderer"
import { NestedStateStore, useNestedState } from "./useNestedState"

export type BaseWidgetProps = TileRendererProps<{ [key: string]: any }>

export function BaseWidget(
    props: {
        state: { [key: string]: any }
        setState: { (state: { [key: string]: any }): void }
    } & MosaicWindowProps<string> &
        PropsWithChildren
) {
    const { state, setState, children, ...windowProps } = props
    return (
        <NestedStateStore state={state} setState={setState} store="widget">
            <MosaicWindow {...windowProps}>
                <div style={{ height: "100%", width: "100%", overflow: "auto" }}>{children}</div>
            </MosaicWindow>
        </NestedStateStore>
    )
}

export function useWidgetState<T>(
    key: Parameters<typeof useNestedState<T>>[1],
    defaultValue: Parameters<typeof useNestedState<T>>[2],
    options?: Parameters<typeof useNestedState<T>>[3]
) {
    return useNestedState("widget", key, defaultValue, options)
}
