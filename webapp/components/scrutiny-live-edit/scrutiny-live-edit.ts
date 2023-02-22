const ATTR_LIVE_EDIT_CANCEL_VAL = "live-edit-last-val"

const CLASS_LIVE_EDIT = "live-edit"
const CLASS_LIVE_EDIT_CONTENT = "live-edit-content"

const EVENT_COMMIT = "live-edit.commit"
const EVENT_CANCEL = "live-edit.cancel"

export function cancel_all_live_edit(): void {
    const live_edited_element = $(`.${CLASS_LIVE_EDIT}`) as JQuery
    live_edited_element.each(function () {
        const element = $(this)
        const last_val = element.attr(ATTR_LIVE_EDIT_CANCEL_VAL)
        _label_mode(element, last_val)
        element.trigger(EVENT_CANCEL)
    })
}

function label_mode($element: JQuery, val?: string): void {
    _label_mode($element, val)
}

function edit_mode($element: JQuery, val?: string): void {
    _edit_mode($element, val)
}

function _get_content($element: JQuery): JQuery {
    const content = $element.find(`.${CLASS_LIVE_EDIT_CONTENT}`)
    if (content.length == 0) {
        throw `No element with class ${CLASS_LIVE_EDIT_CONTENT} inside live-editable element`
    }
    return content
}

function _label_mode($element: JQuery, val?: string): void {
    const content = _get_content($element)
    const span = $(`<span></span>`) as JQuery<HTMLSpanElement>
    if (typeof val !== "undefined") {
        span.text(val)
    }
    content.html(span[0])
    $element.removeClass(CLASS_LIVE_EDIT)
    $element.attr(ATTR_LIVE_EDIT_CANCEL_VAL, "")
}

/**
 * Switch the cell into a textbox for live edition
 * @param td The cell to be edited
 * @param complete_callback The function to call when edition is finished (pressed enter of blur)
 */
function _edit_mode($element: JQuery, val?: string): void {
    const content = _get_content($element)

    let previous_value = ""
    if ($element.hasClass(CLASS_LIVE_EDIT)) {
        const attr = $element.attr(ATTR_LIVE_EDIT_CANCEL_VAL)
        if (typeof attr !== "undefined") {
            previous_value = attr
        }
    } else {
        previous_value = content.text()
        $element.attr(ATTR_LIVE_EDIT_CANCEL_VAL, previous_value)
    }
    $element.addClass(CLASS_LIVE_EDIT)

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

function init($element: JQuery): void {
    const content = _get_content($element)
    $element.on("dblclick", function () {
        _edit_mode($element)
    })
    _label_mode($element, content.text())
}

// public functions
const public_funcs = {
    label_mode: label_mode,
    edit_mode: edit_mode,
}

export function scrutiny_live_edit(...args: any[]) {
    let hasResults = false
    //@ts-ignore
    const results = $(this).map(function () {
        const $table = $(this)

        // Jquery plugin like approach.
        if (args.length == 0) {
            init($table)
        } else if (typeof args[0] === "string") {
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
