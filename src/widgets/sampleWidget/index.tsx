import { useTranslation } from "react-i18next"
import { WidgetMeta } from "../types"
import { BaseWidget, BaseWidgetProps, useWidgetState } from "../shared/BaseWidget"
import * as translations from "./translations"
import { ToolbarControls } from "./components/ToolbarControls"
import { useState } from "react"

export const meta: WidgetMeta = {
    // Folder name under which this widget is defined
    name: "sampleWidget",
    // path to image to use, relative to the public folder, or a JSX Element
    icon: <SvgIcon></SvgIcon>,
    translations,
}

/**
 * Define the component that will be rendered in the window mosaic. Should always be
 * returning <BaseWidget>, in which you should then add the component that you will
 * be using for your Widget.
 *
 * BaseWidget will make a "nested state" available that will allow it to be stored with
 * the dashboard's information when saved. It has a behavior similar to react's useState
 * hook.
 */
export function Widget(props: BaseWidgetProps) {
    const { tileId, ...rest } = props
    const { t } = useTranslation(`widget:${meta.name}`)

    return (
        <BaseWidget {...rest} title={`${t("display_name")} #${tileId}`} toolbarControls={<ToolbarControls></ToolbarControls>}>
            {/* Replace this */}
            <SampleComponent></SampleComponent>
            {/* Until here */}
        </BaseWidget>
    )
}

function SampleComponent() {
    const [widgetValue, setWidgetValue] = useWidgetState("value", "Sample useWidgetState Value")
    const [value, setValue] = useState("Sample useState Value")
    return (
        <div style={{ padding: "10px" }}>
            <p>New Sample Widget! Replace this text by the component you which to have in this widget</p>
            <p>Remove this widget from the side menu by removing it from the src/widgets/index.tsx file</p>

            <h3>Example of useWidgetState</h3>
            <p>
                The following value "{widgetValue}" will be persisted on page reload, and pulled back if this dashboard is saved and then
                reloaded{" "}
            </p>
            <input value={widgetValue} onChange={(ev) => setWidgetValue(ev.target.value)} style={{ width: "100%" }}></input>

            <p>You can also use the "Debug" widget to see the value at all time of the widgetState, under the "Tile Date" section</p>

            <p>
                Furthermore, the value of this widgetState is scoped per window that is opened. You can test this by adding a second window
                of this Sample Widget and confirm that the value above, even though it persists on reload, is not shared accross the other
                instances of it.
            </p>

            <h3>Example of useState</h3>
            <p>
                In contrast, react's built-in useState hook (current value:{value}) can also be used, but it's value will not persist across
                refresh or dashboard save and reload.
            </p>
            <input value={value} onChange={(ev) => setValue(ev.target.value)} style={{ width: "100%" }}></input>
        </div>
    )
}

function SvgIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            // xmlns:xlink="http://www.w3.org/1999/xlink"
            // xmlns:svgjs="http://svgjs.dev/svgjs"
            viewBox="0 0 1422 800"
            id="qqquad"
        >
            <g shape-rendering="crispEdges" stroke-linejoin="round" fill="hsl(220, 62%, 45%)">
                <polygon points="1422,0 1422,200 1066.5,200"></polygon>
                <polygon points="1066.5,0 711,200 1066.5,200"></polygon>
                <polygon points="711,200 1066.5,400 1066.5,200"></polygon>
                <polygon points="1066.5,200 1422,400 1422,200"></polygon>
                <polygon points="711,0 711,200 355.5,200"></polygon>
                <polygon points="0,200 0,0 355.5,0"></polygon>
                <polygon points="355.5,200 0,400 355.5,400"></polygon>
                <polygon points="533.25,200 533.25,300 711,200"></polygon>
                <polygon points="533.25,200 355.5,300 355.5,200"></polygon>
                <polygon points="533.25,400 355.5,300 533.25,300"></polygon>
                <polygon points="711,400 711,300 533.25,300"></polygon>
                <polygon points="711,500 533.25,400 533.25,500"></polygon>
                <polygon points="533.25,500 533.25,400 355.5,400"></polygon>
                <polygon points="533.25,500 355.5,600 533.25,600"></polygon>
                <polygon points="711,500 533.25,500 711,600"></polygon>
                <polygon points="355.5,600 355.5,400 0,400"></polygon>
                <polygon points="0,800 355.5,600 0,600"></polygon>
                <polygon points="711,800 711,600 355.5,800"></polygon>
                <polygon points="1422,400 1066.5,600 1066.5,400"></polygon>
                <polygon points="1066.5,600 1066.5,400 711,400"></polygon>
                <polygon points="1066.5,600 711,800 711,600"></polygon>
                <polygon points="1066.5,600 1422,600 1422,800"></polygon>
            </g>
            <g fill="hsl(220, 62%, 45%)" stroke-width="3" stroke="hsl(220, 43%, 13%)"></g>
        </svg>
    )
}
