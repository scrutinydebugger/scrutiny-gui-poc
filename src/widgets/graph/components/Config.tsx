import { HTMLSelect, Icon, InputGroup, Tooltip } from "@blueprintjs/core"
import { PropsWithChildren, useReducer } from "react"
import { useTranslation } from "react-i18next"
import { Datalogging } from "../../../utils/ScrutinyServer/server_api"
import { Indent, useIndent } from "../../shared/Indent"
import { GraphConfig } from "../types/GraphConfig"
import { Watchable, WatchableType } from "./Watchable"

const NB_OPERANDS_MAP: Record<Datalogging.TriggerType, number> = {
    true: 0,
    eq: 2,
    neq: 2,
    gt: 2,
    get: 2,
    lt: 2,
    let: 2,
    cmt: 2,
    within: 3,
}

export function Config({ value, onChange }: { value: GraphConfig; onChange: { (config: GraphConfig): void } }) {
    const { t } = useTranslation("widget:graph")
    const [{ config: state }, dispatch] = useReducer(graphConfigReducer, { config: value, onChange })
    return (
        <table>
            <tbody>
                <ConfigInput name="config_name">
                    <InputGroup
                        type="text"
                        name="config_name"
                        value={state.config_name}
                        onChange={(ev) =>
                            dispatch({
                                action: "set",
                                field: "config_name",
                                value: ev.target.value,
                            })
                        }
                    />
                </ConfigInput>

                <ConfigInput name="sampling_rate">
                    <HTMLSelect
                        name="sampling_rate"
                        value={state.sampling_rate}
                        fill={true}
                        onChange={(ev) =>
                            dispatch({
                                action: "set",
                                field: "sampling_rate",
                                value: ev.target.value,
                            })
                        }
                    >
                        <option>Todo</option>
                    </HTMLSelect>
                </ConfigInput>

                <ConfigInput name="decimation">
                    <InputGroup
                        type="number"
                        name="decimation"
                        value={"" + state.decimation}
                        onChange={(ev) =>
                            dispatch({
                                action: "set",
                                field: "decimation",
                                value: ev.target.value,
                            })
                        }
                        min={1}
                        size={7}
                    />
                </ConfigInput>

                <ConfigInput name="effective_sampling_rate">
                    <InputGroup
                        name="effective_sampling_rate"
                        type="text"
                        readOnly={true}
                        value={state.effective_sampling_rate}
                        size={10}
                    />
                </ConfigInput>

                <ConfigInput name="probe_location">
                    <InputGroup
                        type="number"
                        name="probe_location"
                        value={"" + state.probe_location}
                        onChange={(ev) =>
                            dispatch({
                                action: "set",
                                field: "probe_location",
                                value: ev.target.value,
                            })
                        }
                        min={0}
                        max={100}
                        size={7}
                    />
                </ConfigInput>

                <ConfigInput name="timeout">
                    <InputGroup
                        type="text"
                        name="timeout"
                        value={state.timeout}
                        onChange={(ev) =>
                            dispatch({
                                action: "set",
                                field: "timeout",
                                value: ev.target.value,
                            })
                        }
                        size={7}
                    />
                </ConfigInput>
                <ConfigInput name="xaxis_type">
                    <HTMLSelect
                        name="xaxis_type"
                        value={state.xaxis_type}
                        fill={true}
                        onChange={(ev) =>
                            dispatch({
                                action: "set",
                                field: "xaxis_type",
                                value: ev.target.value,
                            })
                        }
                    >
                        <option value="ideal_time">{t("config.xaxis_type.options.ideal_time.label")}</option>
                        <option value="measured_time">{t("config.xaxis_type.options.measured_time.label")}</option>
                        <option value="signal">{t("config.xaxis_type.options.signal.label")}</option>
                    </HTMLSelect>
                </ConfigInput>

                <ConfigInput name="xaxis_signal">
                    <Watchable
                        value={state.xaxis_signal}
                        onChange={(value: string | WatchableType) => dispatch({ action: "set", field: "xaxis_signal", value })}
                    ></Watchable>
                </ConfigInput>

                <ConfigInput name="trigger_type">
                    <HTMLSelect
                        name="trigger_type"
                        value={state.trigger_type}
                        fill={true}
                        onChange={(ev) =>
                            dispatch({
                                action: "set",
                                field: "trigger_type",
                                value: ev.target.value,
                            })
                        }
                    >
                        {Object.keys(NB_OPERANDS_MAP).map((op) => (
                            <option value={op} key={op}>
                                {t(`config.trigger_type.options.${op}.label`)}
                            </option>
                        ))}
                    </HTMLSelect>
                </ConfigInput>
                <Indent step={20}>
                    {NB_OPERANDS_MAP[state.trigger_type] > 0 && (
                        <ConfigInput name="operand1">
                            <Watchable
                                allowConstant={true}
                                value={state.operand1}
                                onChange={(value) =>
                                    dispatch({
                                        action: "set",
                                        field: "operand1",
                                        value: value,
                                    })
                                }
                            />
                        </ConfigInput>
                    )}

                    {NB_OPERANDS_MAP[state.trigger_type] > 1 && (
                        <ConfigInput name="operand2">
                            <Watchable
                                value={state.operand2}
                                allowConstant={true}
                                onChange={(value) =>
                                    dispatch({
                                        action: "set",
                                        field: "operand2",
                                        value: value,
                                    })
                                }
                            />
                        </ConfigInput>
                    )}
                    {NB_OPERANDS_MAP[state.trigger_type] > 2 && (
                        <ConfigInput name="operand3">
                            <Watchable
                                value={state.operand3}
                                allowConstant={true}
                                onChange={(value) =>
                                    dispatch({
                                        action: "set",
                                        field: "operand3",
                                        value: value,
                                    })
                                }
                            />
                        </ConfigInput>
                    )}
                </Indent>
                <ConfigInput name="trigger_hold_time">
                    <InputGroup
                        type="number"
                        name="trigger_hold_time"
                        value={"" + state.trigger_hold_time}
                        onChange={(ev) =>
                            dispatch({
                                action: "set",
                                field: "trigger_hold_time",
                                value: ev.target.value,
                            })
                        }
                        size={7}
                    />
                </ConfigInput>

                <tr className="line-estimated-duration">
                    <td className="text-label">Estimated duration</td>
                    <td></td>
                    <td className="label-estimated-duration text-label">N/A</td>
                </tr>
            </tbody>
        </table>
    )
}

function MaybeHtmlTranslation({
    name,
    render,
}: {
    name: string
    render: {
        (content: JSX.Element | null, props: { dangerouslySetInnerHTML?: { __html: string } }): JSX.Element
    }
}) {
    const { t } = useTranslation("widget:graph")
    const value = t(name, { returnObjects: true }) as string | { html?: string }
    if (typeof value === "object" && typeof value?.html === "string")
        return render(null, {
            dangerouslySetInnerHTML: { __html: value.html as string },
        })

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

function ConfigInput({ name, children }: { name: string } & PropsWithChildren) {
    const indent = useIndent()
    return (
        <tr>
            <td style={{ paddingLeft: indent + "px" }}>
                <ConfigLabel name={name}></ConfigLabel>
            </td>

            <Tooltip
                content={
                    <>
                        <ConfigDescription name={name}></ConfigDescription>
                        <ConfigOptions name={name}></ConfigOptions>
                    </>
                }
                targetTagName="td"
            >
                <Icon icon="help"></Icon>
            </Tooltip>
            <td>{children}</td>
        </tr>
    )
}

interface GraphConfigDispatchActionSetValue<K extends keyof GraphConfig> {
    action: "set"
    field: K
    value: GraphConfig[K]
}

interface GraphConfigState {
    config: GraphConfig
    onChange: { (config: GraphConfig): void }
}

function graphConfigReducer<K extends keyof GraphConfig>(prevState: GraphConfigState, action: GraphConfigDispatchActionSetValue<K>) {
    switch (action.action) {
        case "set":
            const newState = {
                ...prevState,
                config: {
                    ...prevState.config,
                    [action.field]: action.value,
                },
            }
            prevState.onChange(newState.config)
            return newState
        default:
            throw new Error("invalid action")
    }
}
