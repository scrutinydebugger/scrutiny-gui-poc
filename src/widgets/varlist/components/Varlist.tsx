import { UnfilteredRows } from "./UnfilteredRows"
import { FilteredRows } from "./FilteredRows"
import { useWidgetState } from "../../shared/BaseWidget"

export function Varlist() {
    const [search] = useWidgetState("search", "")
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
