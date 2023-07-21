import React, { useMemo } from "react"
import "./styles/side_menu.css"

import widgets from "../widgets"
import { useDrag } from "react-dnd"
import { MosaicDragType } from "react-mosaic-component"
import { WidgetMeta } from "../widgets/types"
import { useTileManager } from "../utils/TileManager/useTileManager"
import { ActionAddNewTile } from "../utils/TileManager"
import { MosaicDropData } from "react-mosaic-component/lib/internalTypes"
import { useTranslation } from "react-i18next"
import { Button } from "@blueprintjs/core"

function HorizontalSeparator() {
    return <div className="horizontal_separator"></div>
}

function SideMenuEntry(props: { meta: WidgetMeta }) {
    const { dispatch } = useTileManager()
    const { t } = useTranslation("widget:" + props.meta.name)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [, drag] = useDrag(
        () => ({
            type: MosaicDragType.WINDOW,
            item: () => {
                const item = { ...props.meta, mosaicId: "tileManager" }
                return item
            },

            end(item, monitor) {
                const dropResult = monitor.getDropResult() as MosaicDropData | null
                // widget added
                const action: ActionAddNewTile = {
                    action: "addNewTile",
                    tileType: props.meta.name,
                    position: dropResult?.position ?? "left",
                    path: dropResult?.path ?? ["first"],
                }
                dispatch(action)
            },
        }),
        [props.meta]
    )
    return (
        <>
            <div className="widget_draggable_item" ref={drag}>
                {typeof props.meta.icon === "string" ? (
                    <img src={props.meta.icon} width="64px" height="48px" alt={t("display_name") ?? "icon"}></img>
                ) : (
                    props.meta.icon
                )}
                <span className="widget_draggable_label">{t("display_name")}</span>
            </div>
        </>
    )
}

export default function SideMenu(props: {}): React.JSX.Element {
    const entries = useMemo(
        () =>
            widgets.map(({ meta }) => {
                return (
                    <div key={meta.name}>
                        <SideMenuEntry meta={meta}></SideMenuEntry>
                        <HorizontalSeparator></HorizontalSeparator>
                    </div>
                )
            }),
        []
    )
    const { clearAll } = useTileManager()

    return (
        <div className="side_menu">
            <div>
                <Button onClick={clearAll}>Clear All</Button>
            </div>
            <HorizontalSeparator></HorizontalSeparator>
            {entries}
        </div>
    )
}
