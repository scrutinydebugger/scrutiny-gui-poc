//    scrutiny-multiselect.ts
//        Components that mimic the behavior of a multiselect input, but can be applied to
//        any HTML element.
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2023 Scrutiny Debugger

const CLASS_SELECTED = "scrutiny-multiselect-selected"
const CLASS_MULTISELECT = "scrutiny-multiselect"
const CLASS_MULTISELECT_ITEM = "scrutiny-multiselect-item"
const CLASS_CONTAINER_FOCUS = "scrutiny-multiselect-focus"

export const EVENT_SELECT = "scrutiny-multiselect-select"
export const EVENT_UNSELECT = "scrutiny-multiselect-unselect"
export const EVENT_FOCUS = "scrutiny-multiselect-focus"
export const EVENT_BLUR = "scrutiny-multiselect-blur"

export interface SelectEventData {
    items: JQuery
}

export interface UnselectEventData {
    items: JQuery
}

const PLUGIN_NAME = "scrutiny-multiselect"
const DATAKEY_OPTIONS = "scrutiny-multiselect-options"
const DEFAULT_OPTIONS = {
    selectables: $(),
}

export interface JQueryMultiselect<T> extends JQuery<T> {
    scrutiny_multiselect: Function
}

type PluginOptionsFull = typeof DEFAULT_OPTIONS
export type PluginOptions = Partial<PluginOptionsFull> // The user doesn't have to specify them all

/**
 * Format an error message when throwing an exception
 * @param msg Error message
 * @returns Formatted error message
 */
function _error_msg(msg: string): string {
    return `[${PLUGIN_NAME}]: ${msg}`
}

function _get_focused_container(): JQuery {
    return $(`.${CLASS_CONTAINER_FOCUS}`)
}

/**
 * Tells if a selectable element within a multiselect container is actually selected
 * @param element The selectable element
 * @returns True if the element is currently selected
 */
function is_selected(element: JQuery): boolean {
    if (!element.hasClass(CLASS_MULTISELECT_ITEM)) {
        throw _error_msg("Element is not a selectable element")
    }
    return element.hasClass(CLASS_SELECTED)
}

/**
 * Tells if a multiselect container currently has focus
 * @param element The plugin multiselect container
 * @returns true if the container has focus
 */
function is_focused(element: JQuery): boolean {
    if (!element.hasClass(CLASS_MULTISELECT)) {
        throw _error_msg("Element is not a multiselect container")
    }

    return element.hasClass(CLASS_CONTAINER_FOCUS)
}

/**
 * Returns the list of selected elements within a container
 * @param element The plugin multiselect container
 * @returns List of selected childrens
 */
function get_selected(element: JQuery): JQuery {
    if (!element.hasClass(CLASS_MULTISELECT)) {
        throw _error_msg("Element is not a multiselect container")
    }

    return element.find(`.${CLASS_MULTISELECT_ITEM}.${CLASS_SELECTED}`)
}

/**
 * Unselect a list of items
 * @param container The plugin container element
 * @param items Children of container that needs to be selected
 */
function _unselect(container: JQuery, items: JQuery): void {
    const items_to_unselect = items.filter(`.${CLASS_SELECTED}`)
    items_to_unselect.removeClass(CLASS_SELECTED)
    if (items_to_unselect.length > 0) {
        container.trigger(EVENT_UNSELECT, { items: items_to_unselect })
    }
}

/**
 * Select a list of items
 * @param container The plugin container element
 * @param items Childres of container that needs to be selected
 */
function _select(container: JQuery, items: JQuery): void {
    const items_to_select = items.filter(`:not(.${CLASS_SELECTED})`)
    items_to_select.addClass(CLASS_SELECTED)
    if (items_to_select.length > 0) {
        container.trigger(EVENT_SELECT, { items: items_to_select })
    }
}

/**
 * Tells if an element is selected.
 * @param element The selectable element inside a container
 * @returns True if the element is selected
 */
function _is_selected(element: JQuery): boolean {
    return element.hasClass(CLASS_SELECTED)
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

/**
 * Add a global body handlers to manage focus groups.
 */
function _global_init_body() {
    const body = $("body") as JQuery<HTMLBodyElement>

    body.on("click", function (e: JQuery.ClickEvent) {
        const target = $(e.target)
        let new_focus = target.filter(`.${CLASS_MULTISELECT}`)
        if (new_focus.length == 0) {
            new_focus = target.parents(`.${CLASS_MULTISELECT}:first`).first()
        }
        const to_blur = _get_focused_container().not(new_focus)

        to_blur.removeClass(CLASS_CONTAINER_FOCUS).trigger(EVENT_BLUR)

        if (!new_focus.hasClass(CLASS_CONTAINER_FOCUS)) {
            new_focus.addClass(CLASS_CONTAINER_FOCUS)
            new_focus.trigger(EVENT_FOCUS)
        }
    })

    // If escape key is pressed, blur active element in active focus group
    body.on("keydown", function (e) {
        if (e.key == "Escape") {
            const focused = _get_focused_container()
            focused.removeClass(CLASS_CONTAINER_FOCUS)
            focused.trigger(EVENT_BLUR)

            const to_unselect = focused.children(`.${CLASS_MULTISELECT_ITEM}.${CLASS_SELECTED}`)
            _unselect(focused, to_unselect)
        }
    })
}

/**
 * Initialize the plugin on a Jquery element
 * @param $container Element to make a multiselect container
 * @param config The plugin configuration
 */
function init($container: JQuery, config?: PluginOptions): void {
    _global_init()
    const options: PluginOptionsFull = $.extend({}, DEFAULT_OPTIONS, config)
    $container.data(DATAKEY_OPTIONS, options)
    $container.addClass(CLASS_MULTISELECT)

    if (options.selectables.length == 0) {
        throw _error_msg("Select func returned no element.")
    }

    const selectables = options.selectables

    selectables.each(function () {
        if ($(this).parents().filter($container).length == 0) {
            throw _error_msg("Selectable elements are not all child of the plugin container")
        }
    })

    selectables.addClass(CLASS_MULTISELECT_ITEM)

    selectables.on("click", function (e: JQuery.ClickEvent) {
        const element = $(this)
        if (e.ctrlKey) {
            if (!_is_selected(element)) {
                _select($container, element)
            } else {
                _unselect($container, element)
            }
        } else {
            _unselect($container, selectables.not(element))
            _select($container, element)
        }
    })
}

// public functions
const public_funcs = {
    init: init,
    is_selected: is_selected,
    is_focused: is_focused,
    get_selected: get_selected,
}

export function scrutiny_multiselect(...args: any[]) {
    let hasResults = false
    //@ts-ignore
    const results = $(this).map(function () {
        const $element = $(this)

        // Jquery plugin like approach.
        if (args.length < 1) throw "Missing arguments"
        if (typeof args[0] === "string") {
            const funcname = args[0]
            if (!public_funcs.hasOwnProperty(funcname)) {
                throw _error_msg("Unknown function " + funcname)
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
