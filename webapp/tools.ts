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
 * Trims a string by removing the given character from end only.
 * @param str The string to trim
 * @param ch The character to remove
 * @returns The trimmed string
 */
export function trim_end(str: string, ch: string): string {
    var start = 0,
        end = str.length

    while (end > start && str[end - 1] === ch) --end

    return start > 0 || end < str.length ? str.substring(start, end) : str
}

/**
 * Trims a string by removing the given character from start only.
 * @param str The string to trim
 * @param ch The character to remove
 * @returns The trimmed string
 */
export function trim_start(str: string, ch: string): string {
    var start = 0,
        end = str.length

    while (start < end && str[start] === ch) ++start

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

export function number2str(x: number, max_digits: number = 13): string {
    return x.toFixed(max_digits).replace(/\.?0*$/, "")
}

/**
 * Clamps a value between min and max inclusively.
 * @param val The value to clamp
 * @param min The lower limit
 * @param max The high limit
 * @returns Clamped value
 */
export function clamp_val(val: number, min: number, max: number): number {
    if (isNaN(val)) {
        val = min
    }
    if (val < min) {
        val = min
    }
    if (val > max) {
        val = max
    }
    return val
}

export function force_input_int(input: JQuery<HTMLInputElement>, min: number, max: number) {
    let val = parseInt(input.val() as string)
    val = clamp_val(val, min, max)
    if (val != input.val()) {
        // string and integer can be compared legally
        input.val(val)
    }
}

export function force_input_float(input: JQuery<HTMLInputElement>, min: number, max: number) {
    let val = parseFloat(input.val() as string)
    val = clamp_val(val, min, max)
    if (val != input.val()) {
        // string and integer can be compared legally
        input.val(val)
    }
}

export function set_nested(obj: Record<string, any>, path: string[], value: any): void {
    if (path.length === 1) {
        obj[path[0]] = value
    } else {
        if (typeof obj[path[0]] === "undefined") {
            obj[path[0]] = {}
        }
        set_nested(obj[path[0]], path.slice(1), value)
    }
}
