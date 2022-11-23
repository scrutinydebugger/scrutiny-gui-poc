//    dom_testing_tools.ts
//        Some testing tools dedicated to DOM handling
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

import { default as $ } from "@jquery"

export function make_row(nb_col: number): JQuery<HTMLTableRowElement> {
    const row = $("<tr></tr>") as JQuery<HTMLTableRowElement>
    for (let i = 0; i < nb_col; i++) {
        row.append($("<td></td>"))
    }

    return row
}

export function make_row_from_content(content: string[]): JQuery<HTMLTableRowElement> {
    const row = $("<tr></tr>")
    for (let i = 0; i < content.length; i++) {
        row.append($(`<td>${content[i]}</td>`))
    }

    return row
}

export function make_head_row(nb_col: number): JQuery<HTMLTableRowElement> {
    const row = $("<tr></tr>") as JQuery<HTMLTableRowElement>
    for (let i = 0; i < nb_col; i++) {
        row.append($("<th></th>"))
    }

    return row
}

export function make_table(table_id: string, nb_col: number, nb_row: number = 0): JQuery<HTMLTableElement> {
    const body = $("body") as JQuery<HTMLBodyElement>
    const table = $(`<table><thead></thead><tbody></tbody></table>`) as JQuery<HTMLTableElement>

    table.find("thead").append(make_head_row(nb_col))
    const tbody = table.find("tbody")
    for (let i = 0; i < nb_row; i++) {
        tbody.append(make_row(nb_col))
    }

    table.attr("id", table_id)
    return table
}
