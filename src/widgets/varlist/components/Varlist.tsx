import { BaseWidget, BaseWidgetProps } from "../../shared/BaseWidget"
import { useTranslation } from "react-i18next"
import { useNestedState } from "../../shared/useNestedState"
import { ToolbarControls } from "./ToolbarControls"
import { UnfilteredRows } from "./UnfilteredRows"
import { FilteredRows } from "./FilteredRows"

export function Varlist(props: BaseWidgetProps) {
    const { tileId, ...rest } = props
    const { t } = useTranslation("widget:varlist")

    return (
        <BaseWidget {...rest} title={`${t("display_name")} #${tileId}`} toolbarControls={<ToolbarControls></ToolbarControls>}>
            <SearchOrList></SearchOrList>
        </BaseWidget>
    )
}

function SearchOrList() {
    const [search] = useNestedState("widget", "search", "")

    return (
        <div className="varlist-content">
            <div className="varlist-tree-container">
                <table className="varlist-table" style={{ width: "100%" }}>
                    <thead>
                        <tr>
                            <th></th>
                            <th style={{ width: "50px" }}>Type</th>
                        </tr>
                    </thead>
                    <tbody>{search ? <FilteredRows search={search}></FilteredRows> : <UnfilteredRows></UnfilteredRows>}</tbody>
                </table>
            </div>
        </div>
    )
}
