//    tools.ts
//        Some tools used project wide
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

/**
 * Trims a string by removing the given characters (multiple) from both beginning and end.
 * @param str The string to trim
 * @param chars A string containing a list of chars to be trimmed
 * @returns The trimmed string  
 */
export function trimAny(str: string, chars: string): string {
    var start = 0,
        end = str.length

    while (start < end && chars.indexOf(str[start]) >= 0) ++start

    while (end > start && chars.indexOf(str[end - 1]) >= 0) --end

    return start > 0 || end < str.length ? str.substring(start, end) : str
}

/**
 * Trims a string by removing the given character from both beginning and end.
 * @param str The string to trim
 * @param ch The character to remove
 * @returns The trimmed string  
 */
export function trim(str: string, ch: string): string {
    var start = 0,
        end = str.length

    while (start < end && str[start] === ch) ++start

    while (end > start && str[end - 1] === ch) --end

    return start > 0 || end < str.length ? str.substring(start, end) : str
}

/**
 * Reads a GET parameter from the URL
 * @param name The name of the parameter
 * @returns The value of the parameter
 */
export function get_url_param(name: string): string {
    name = name.replace(/[[]/, "\\[").replace(/[\]]/, "\\]")
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)")
    var results = regex.exec(location.search)
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "))
}
