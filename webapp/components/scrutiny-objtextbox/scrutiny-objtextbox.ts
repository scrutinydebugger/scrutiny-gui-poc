//    scrutiny-objtextbox.ts
//        Component making a textbox convertible into any element that represent a custom object.
//        Mainly used to drop watchable into textbox
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2023 Scrutiny Debugger

const CLASS_OBJTEXTBOX = "otb"
const CLASS_OBJTEXTBOX_HAS_OBJ = "otb-obj"
const CLASS_OBJTEXTBOX_OBJ_SELECTED = "otb-obj-selected"

const EVENT_SELECT = "otb.select"
const EVENT_UNSELECT = "otb.unselect"
const EVENT_DELETE = "otb.delete"
const EVENT_OBJ_SET = "otb.obj_set"
const EVENT_OBJ_UNSET = "otb.obj_unset"
const EVENT_CHANGE = "change"

const DATAKEY_OPTIONS = "otb-dk-options"
const DATAKEY_OBJ = "otb-dk-obj"

const DEFAULT_OPTIONS = {
    input_template: $("<input type='text' />") as JQueryTextBox, // Input element to use as a template when converting to textbox
    render_func: null as ((obj: object) => JQuery) | null, // Function that creates the element that represent the object
}

type JQueryTextBox = JQuery<HTMLInputElement>
type JQueryDiv = JQuery<HTMLDivElement>
type PluginOptionsFull = typeof DEFAULT_OPTIONS
export type PluginOptions = Partial<PluginOptionsFull> // The user doesn't have to specify them all

export interface JQueryObjTextbox extends JQueryDiv {
    scrutiny_objtextbox: Function
}

function is_text_mode($element: JQueryDiv) {
    return _is_text_mode($element)
}
function is_obj_mode($element: JQueryDiv) {
    return _is_obj_mode($element)
}
function set_text($element: JQueryDiv, val: string) {
    return _set_text($element, val)
}
function set_obj($element: JQueryDiv, obj: object) {
    return _set_obj($element, obj)
}
function get_obj($element: JQueryDiv): object | null {
    return _get_obj($element)
}
function get_text($element: JQueryDiv): string {
    return _get_text($element)
}
function is_obj_selected($element: JQueryDiv): boolean {
    return _is_obj_selected($element)
}

/**
 * Get the plugin options stored in the JQuery element
 * @param $element The JQuery table
 * @returns the plugin options
 */
function _get_options($element: JQuery): PluginOptionsFull {
    return $element.data(DATAKEY_OPTIONS) as PluginOptionsFull
}

function _is_text_mode($element: JQueryDiv): boolean {
    return !$element.hasClass(CLASS_OBJTEXTBOX_HAS_OBJ)
}

function _is_obj_mode($element: JQueryDiv): boolean {
    return $element.hasClass(CLASS_OBJTEXTBOX_HAS_OBJ)
}

function _is_obj_selected($element: JQueryDiv): boolean {
    return _is_obj_mode($element) && $element.hasClass(CLASS_OBJTEXTBOX_OBJ_SELECTED)
}

function _get_textbox($element: JQueryDiv): JQueryTextBox {
    const textbox = $element.find("input:first-child").first() as JQueryTextBox
    if (textbox.length == 0) {
        throw "Missing textbox in objtextbox element"
    }
    return textbox
}

function _set_text_mode($element: JQueryDiv, force_create: boolean = false): JQueryTextBox {
    let textbox: JQueryTextBox | null = null
    const is_text_mode = _is_text_mode($element)
    if (!is_text_mode || force_create) {
        _unselect($element)
        $element.removeClass(CLASS_OBJTEXTBOX_HAS_OBJ)
        const obj = $element.data(DATAKEY_OBJ)
        $element.data(DATAKEY_OBJ, null)

        textbox = _get_options($element).input_template.clone()
        $element.html("").append(textbox)
        textbox.on("change", function () {
            $element.trigger(EVENT_CHANGE)
        })
        if (!is_text_mode) {
            // Do not fire event on creation
            $element.trigger(EVENT_OBJ_UNSET, obj)
            $element.trigger(EVENT_CHANGE)
        }
    } else {
        textbox = _get_textbox($element)
    }

    return textbox
}

function _set_obj_mode($element: JQueryDiv): void {
    $element.data(DATAKEY_OBJ, null)
    $element.addClass(CLASS_OBJTEXTBOX_HAS_OBJ)
}

function _set_text($element: JQueryDiv, text: string): void {
    _set_text_mode($element).val(text)
}

function _set_obj($element: JQueryDiv, obj: object): void {
    const options = _get_options($element)
    _set_obj_mode($element)
    $element.html("")
    $element.data(DATAKEY_OBJ, obj)
    if (options.render_func != null) {
        const content = options.render_func(obj)
        $element.append(content)
        $element.trigger(EVENT_OBJ_SET, obj)
        $element.trigger(EVENT_CHANGE)
    } else {
        throw "Missing render function in options"
    }
}

function _get_obj($element: JQueryDiv): object | null {
    if (!_is_obj_mode($element)) {
        throw "Cannot read object. objtextbox element is not in object mode"
    }
    const obj = $element.data(DATAKEY_OBJ)
    if (typeof obj === "undefined") {
        return null
    }
    return obj
}

function _get_text($element: JQueryDiv): string {
    if (!_is_text_mode($element)) {
        throw "Cannot read text. objtextbox element is not in text mode"
    }
    return _get_textbox($element).val() as string
}

function _unselect($element: JQueryDiv): void {
    if (_is_obj_mode($element) && _is_obj_selected($element)) {
        const obj = _get_obj($element)
        $element.removeClass(CLASS_OBJTEXTBOX_OBJ_SELECTED)
        if (obj !== null) {
            $element.trigger(EVENT_UNSELECT, obj)
        }
    }
}

function _select($element: JQueryDiv): void {
    if (_is_obj_mode($element) && !_is_obj_selected($element)) {
        $element.addClass(CLASS_OBJTEXTBOX_OBJ_SELECTED)
        const obj = _get_obj($element)
        if (obj !== null) {
            $element.trigger(EVENT_SELECT, obj)
        }
    }
}

const _global_init = (function () {
    let executed = false
    return function () {
        if (!executed) {
            executed = true
            _global_init_body()
        }
    }
})()

function _get_otb_with_selected_obj() {
    return $(`div.${CLASS_OBJTEXTBOX}.${CLASS_OBJTEXTBOX_OBJ_SELECTED}`) as JQueryDiv
}

function _global_init_body() {
    const body = $("body") as JQuery<HTMLBodyElement>
    body.on("click", function (e) {
        _unselect(_get_otb_with_selected_obj())
    })

    body.on("keydown", function (e) {
        const selected_otb = _get_otb_with_selected_obj()
        if (selected_otb.length == 0) {
            return
        }
        const obj = _get_obj(selected_otb)
        if (obj !== null) {
            if (e.key == "Delete") {
                _set_text(selected_otb, "")
                selected_otb.trigger(EVENT_DELETE, obj)
                e.preventDefault()
            } else if (e.key == "Escape") {
                _unselect(selected_otb)
                e.preventDefault()
            }
        }
    })
}

function init($element: JQueryDiv, config?: null | PluginOptions, val?: string | object): void {
    _global_init()

    const options: PluginOptionsFull = $.extend({}, DEFAULT_OPTIONS, config)
    $element.data(DATAKEY_OPTIONS, options)

    $element.addClass(CLASS_OBJTEXTBOX)
    if (typeof val === "undefined") {
        val = ""
    }

    if (typeof val === "string") {
        _set_text_mode($element, true) // Force create a textbox
        _set_text($element, val)
    } else {
        _set_obj($element, val)
    }

    $element.on("click", function (e) {
        const selected = _get_otb_with_selected_obj()
        if (!selected.is($element)) {
            _unselect(selected)
        }
        _select($element)
        e.stopPropagation()
    })
}

// public functions
const public_funcs = {
    init: init,
    is_text_mode: is_text_mode,
    is_obj_mode: is_obj_mode,
    set_text: set_text,
    set_obj: set_obj,
    get_obj: get_obj,
    get_text: get_text,
    is_obj_selected: is_obj_selected,
}

export function scrutiny_objtextbox(...args: any[]) {
    let hasResults = false
    //@ts-ignore
    const results = $(this).map(function () {
        const $table = $(this)

        // Jquery plugin like approach.
        if (args.length < 1) throw "Missing arguments"

        if (typeof args[0] === "string") {
            const funcname = args[0]
            if (!public_funcs.hasOwnProperty(funcname)) {
                throw "Unknown function " + funcname
            }
            //@ts-ignore
            const result = public_funcs[funcname]($table, ...args.slice(1))
            if (typeof result !== "undefined") {
                hasResults = true
                return result
            }
        } else {
            init($table, args[0])
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
