//    tools.ts
//        Some tools used project wide
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

export function trimAny(str: string, chars: string): string {
    var start = 0,
        end = str.length

    while (start < end && chars.indexOf(str[start]) >= 0) ++start

    while (end > start && chars.indexOf(str[end - 1]) >= 0) --end

    return start > 0 || end < str.length ? str.substring(start, end) : str
}

// Fastest Trim algo according to stack overflow
export function trim(str: string, ch: string): string {
    var start = 0,
        end = str.length

    while (start < end && str[start] === ch) ++start

    while (end > start && str[end - 1] === ch) --end

    return start > 0 || end < str.length ? str.substring(start, end) : str
}

export function get_url_param(name: string): string {
    name = name.replace(/[[]/, "\\[").replace(/[\]]/, "\\]")
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)")
    var results = regex.exec(location.search)
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "))
}
