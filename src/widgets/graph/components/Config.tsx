import { PropsWithChildren } from "react"
import { useTranslation } from "react-i18next"

function MaybeHtmlTranslation({
    name,
    render,
}: {
    name: string
    render: { (content: JSX.Element | null, props: { dangerouslySetInnerHTML?: { __html: string } }): JSX.Element }
}) {
    const { t } = useTranslation("widget:graph")
    const value = t(name, { returnObjects: true }) as string | { html?: string }
    if (typeof value === "object" && typeof value?.html === "string")
        return render(null, { dangerouslySetInnerHTML: { __html: value.html as string } })

    return render(<>{value}</>, {})
}

function ConfigLabel({ name }: { name: string }) {
    return (
        <MaybeHtmlTranslation
            name={`config.${name}.label`}
            render={(content, props) => <span {...props}>{content}</span>}
        ></MaybeHtmlTranslation>
    )
}
function ConfigDescription({ name }: { name: string }) {
    return (
        <MaybeHtmlTranslation
            name={`config.${name}.description`}
            render={(content, props) => <div {...props}>{content}</div>}
        ></MaybeHtmlTranslation>
    )
}

function ConfigOptions({ name }: { name: string }) {
    const { t } = useTranslation("widget:graph")

    const options = t(`config.${name}.options`, { returnObjects: true })
    if (typeof options === "string") return <></>
    const keys = Object.keys(options)
    return (
        <ul>
            {Object.values(options).map(({ label, description }, idx) => (
                <li key={keys[idx]}>
                    <b>{label}:</b>{" "}
                    {typeof description === "object" && typeof description?.html === "string" ? (
                        <span dangerouslySetInnerHTML={{ __html: description.html }}></span>
                    ) : (
                        description
                    )}
                </li>
            ))}
        </ul>
    )
}
export function ConfigInput({ name, children }: { name: string } & PropsWithChildren) {
    return (
        <div>
            <ConfigLabel name={name}></ConfigLabel>
            <ConfigDescription name={name}></ConfigDescription>
            <ConfigOptions name={name}></ConfigOptions>
            {children}
        </div>
    )
}

export function Config(props: {}) {
    return (
        <div className="form-pane">
            <ConfigInput name="config_name">
                <input type="text" name="config_name" defaultValue="Graph" />
            </ConfigInput>

            <ConfigInput name="sampling_rate">
                <select name="sampling_rate"></select>
            </ConfigInput>

            <ConfigInput name="decimation">
                <input type="number" name="decimation" defaultValue={1} min={1} size={7} />
            </ConfigInput>

            <ConfigInput name="effective_sampling_rate">
                <input name="effective_sampling_rate" type="text" readOnly={true} size={10} />
            </ConfigInput>

            <ConfigInput name="probe_location">
                <input type="number" name="probe_location" defaultValue={50} min={0} max={100} size={7} />
            </ConfigInput>

            <ConfigInput name="timeout">
                <input type="text" name="timeout" defaultValue={0} size={7} />
            </ConfigInput>
            <ConfigInput name="xaxis_type">
                <select name="xaxis_type">
                    <option value="ideal_time">Ideal Time</option>
                    <option value="measured_time">Measured Time</option>
                    <option value="signal">Watchable</option>
                </select>
            </ConfigInput>

            <ConfigInput name="xaxis_signal">
                <div className="xaxis-watchable-objtextox"></div>
            </ConfigInput>

            <ConfigInput name="trigger_type">
                <select name="trigger_type">
                    <option value="true">Always True</option>
                    <option value="eq">Equal</option>
                    <option value="neq">Not Equal</option>
                    <option value="gt">Greater Than</option>
                    <option value="get">Greater or Equal Than</option>
                    <option value="lt">Less Than</option>
                    <option value="let">Less or Equal Than</option>
                    <option value="cmt">Change More Than</option>
                    <option value="within">Is Within</option>
                </select>
            </ConfigInput>

            <ConfigInput name="operand1">
                <div className="graph-operand-objtextbox operand1"></div>
            </ConfigInput>

            <ConfigInput name="operand2">
                <div className="graph-operand-objtextbox operand2"></div>
            </ConfigInput>

            <ConfigInput name="operand3">
                <div className="graph-operand-objtextbox operand3"></div>
            </ConfigInput>

            <ConfigInput name="trigger_hold_time">
                <input type="number" name="trigger_hold_time" defaultValue={0} size={7} />
            </ConfigInput>

            {/* <tr className="line-estimated-duration">
                        <td className="text-label">Estimated duration</td>
                        <td></td>
                        <td className="label-estimated-duration text-label">N/A</td>
                    </tr> */}
        </div>
    )
}
