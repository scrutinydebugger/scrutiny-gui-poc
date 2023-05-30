//    scrutiny-live-edit.ts
//        Make a field live-editable by switch the content to a textbox on double click
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2023 Scrutiny Debugger

import { default as $ } from "jquery"

const ATTR_LIVE_EDIT_CANCEL_VAL = "live-edit-last-val"

const CLASS_LIVE_EDIT_ACTIVE = "live-edit-active"
const CLASS_LIVE_EDIT = "live-edit"
export const CLASS_LIVE_EDIT_CONTENT = "live-edit-content"

const EVENT_COMMIT = "live-edit.commit"
const EVENT_CANCEL = "live-edit.cancel"

/**
 * Put all live edit element back to label mode and restore their previous label value
 */
export function cancel_all_live_edit(): void {
    const live_edited_element = $(`.${CLASS_LIVE_EDIT_ACTIVE}`) as JQuery
    live_edited_element.each(function () {
        const element = $(this)
        const last_val = element.attr(ATTR_LIVE_EDIT_CANCEL_VAL)
        _label_mode(element, last_val)
        element.trigger(EVENT_CANCEL)
    })
}

export interface JQueryLiveEdit<T> extends JQuery<T> {
    live_edit: Function
}

function label_mode($element: JQuery, val?: string): void {
    _label_mode($element, val)
}

function edit_mode($element: JQuery, val?: string): void {
    _edit_mode($element, val)
}

function has_live_edit($element: JQuery): boolean {
    return $element.hasClass(CLASS_LIVE_EDIT)
}

/**
 * Tells if the live-editable element is in edit mode
 * @param $element The live-editable element
 * @returns true if the element is in edit mode
 */
function is_edit_mode($element: JQuery): boolean {
    return $element.hasClass(CLASS_LIVE_EDIT_ACTIVE)
}

/**
 * Tells if the live-editable element is in label mode
 * @param $element The live-editable element
 * @returns true if the element is in label-mode
 */
function is_label_mode($element: JQuery): boolean {
    return !$element.hasClass(CLASS_LIVE_EDIT_ACTIVE)
}

/**
 * Get the subelement that will switched between textbox and element
 * @param $element The live-editable element
 * @returns The sub-element that can be replaced by a textbox/label
 */
function _get_content($element: JQuery): JQuery {
    const content = $element.find(`.${CLASS_LIVE_EDIT_CONTENT}`)
    if (content.length == 0) {
        throw `No element with class ${CLASS_LIVE_EDIT_CONTENT} inside live-editable element`
    }
    return content
}

/**
 * Turn an element into label mode, changing the content for a text element displaying the value
 * @param $element The live-editable element
 * @param val The value to put in the element. The content will be empty if undefined
 */
function _label_mode($element: JQuery, val?: string): void {
    const content = _get_content($element)
    if (typeof val === "undefined") {
        val = ""
    }
    content.html(val)
    $element.removeClass(CLASS_LIVE_EDIT_ACTIVE)
    $element.attr(ATTR_LIVE_EDIT_CANCEL_VAL, "")
}

/**
 * Turn an element into edit mode, changing the content for an input box
 * @param $element The live-editable element
 * @param val The value to put in the textbox. The label value will be used if undefined
 */
function _edit_mode($element: JQuery, val?: string): void {
    const content = _get_content($element)

    let previous_value = ""
    if ($element.hasClass(CLASS_LIVE_EDIT_ACTIVE)) {
        const attr = $element.attr(ATTR_LIVE_EDIT_CANCEL_VAL)
        if (typeof attr !== "undefined") {
            previous_value = attr
        }
    } else {
        previous_value = content.text()
        $element.attr(ATTR_LIVE_EDIT_CANCEL_VAL, previous_value)
    }
    $element.addClass(CLASS_LIVE_EDIT_ACTIVE)

    const input = $("<input type='text' />") as JQuery<HTMLInputElement>

    input.on("blur", function () {
        const valstr = input.val() as string
        $element.trigger(EVENT_COMMIT, valstr)
        _label_mode($element, valstr)
    })

    input.on("keydown", function (e) {
        if (e.key == "Enter") {
            const valstr = input.val() as string
            $element.trigger(EVENT_COMMIT, valstr)
            _label_mode($element, valstr)
            e.stopPropagation()
        }

        if (e.key == "Escape") {
            $element.trigger(EVENT_CANCEL)
            _label_mode($element, previous_value)
            e.stopPropagation()
        }
    })

    if (typeof val === "undefined") {
        val = previous_value
    }
    input.val(val)
    content.html(input[0])

    setTimeout(function () {
        $element.find("input").trigger("focus").trigger("select")
    }, 0)
}

/**
 * Initialize a component to be live-editable. Install an event handler on double-click to trigger it
 * @param $element The live-editable element
 * @param val Optional value to set on the label after init
 */
function init($element: JQuery, val?: string): void {
    $element.addClass(CLASS_LIVE_EDIT)
    const content = _get_content($element)
    $element.on("dblclick", function () {
        _edit_mode($element)
    })
    if (typeof val === "undefined") {
        val = content.text()
    }
    _label_mode($element, val)
}

// public functions
const public_funcs = {
    init: init,
    label_mode: label_mode,
    edit_mode: edit_mode,
    is_edit_mode: is_edit_mode,
    is_label_mode: is_label_mode,
    has_live_edit: has_live_edit,
}

export function scrutiny_live_edit(...args: any[]) {
    let hasResults = false
    //@ts-ignore
    const results = $(this).map(function () {
        const $element = $(this)

        // Jquery plugin like approach.
        if (args.length < 1) throw "Missing arguments"
        if (typeof args[0] === "string") {
            const funcname = args[0]
            if (!public_funcs.hasOwnProperty(funcname)) {
                throw "Unknown function " + funcname
            }
            //@ts-ignore
            const result = public_funcs[funcname]($element, ...args.slice(1))
            if (typeof result !== "undefined") {
                hasResults = true
                return result
            }
        } else {
            init($element, args[0])
        }
    })

    // When no result were provided, return the same `this` that we received
    if (!hasResults) {
        //@ts-ignore
        return this
    }
    // optionally, when there was only one item targeted, return the result
    // directly
    else if (results.length === 1) {
        return results[0]
    }
    // otherwise return the jQuery mapped results.
    else {
        return results
    }
}
