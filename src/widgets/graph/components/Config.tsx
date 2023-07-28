import { HTMLSelect, Icon, InputGroup, Tooltip } from "@blueprintjs/core"
import { PropsWithChildren, useEffect, useReducer, useState } from "react"
import { useTranslation } from "react-i18next"
import { ValueDataType } from "../../../utils/ScrutinyServer/server_api"
import { Indent, useIndent } from "../../shared/Indent"
import { GraphConfig } from "../types/GraphConfig"
import { Watchable, WatchableType } from "./Watchable"
import { useScrutinyStatus } from "../../../utils/ScrutinyServer/useScrutinyStatus"

import { NB_OPERANDS_MAP, TYPEMAP } from "../constants"
import { useScrutinyDatastore } from "../../../utils/ScrutinyServer"
import { DatastoreEntryType } from "../../../utils/ScrutinyServer/datastore"
import { useEventManager } from "../../../utils/EventManager"

export function Config({ value, onChange }: { value: GraphConfig; onChange: { (config: GraphConfig): void } }) {
    const { t } = useTranslation("widget:graph")
    const [{ config: state }, dispatch] = useReducer(graphConfigReducer, { config: value, onChange } as GraphConfigState)
    const estimatedDuration = useEstimatedDuration(state)
    const { deviceDataloggingCapabilities } = useScrutinyStatus()

    // if deviceDataloggingCapabilities === null, disable "Acquire"
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
                        value={state.sampling_rate?.identifier ?? 0}
                        fill={true}
                        onChange={(ev) => {
                            const identifier = parseInt(ev.target.value)
                            dispatch({
                                action: "set",
                                field: "sampling_rate",
                                value: deviceDataloggingCapabilities?.sampling_rates.find((rate) => rate.identifier === identifier) ?? null,
                            })
                        }}
                    >
                        {deviceDataloggingCapabilities ? (
                            deviceDataloggingCapabilities.sampling_rates.map((sampling_rate) => (
                                <option value={sampling_rate.identifier} key={sampling_rate.identifier}>
                                    {sampling_rate.type === "fixed_freq"
                                        ? number2str(sampling_rate.frequency as number, 3) + " Hz"
                                        : `VF[${sampling_rate.identifier}] : ${sampling_rate.name ? sampling_rate.name : "<No name>"}`}
                                </option>
                            ))
                        ) : (
                            <option>N/A</option>
                        )}
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
                                value: parseInt(ev.target.value),
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
                        <option disabled={deviceDataloggingCapabilities === null} value="ideal_time">
                            {t("config.xaxis_type.options.ideal_time.label")}
                        </option>
                        <option disabled={state.sampling_rate?.type == "variable_freq"} value="measured_time">
                            {t("config.xaxis_type.options.measured_time.label")}
                        </option>
                        <option value="signal">{t("config.xaxis_type.options.signal.label")}</option>
                    </HTMLSelect>
                </ConfigInput>

                <ConfigInput name="xaxis_signal">
                    <Watchable
                        value={state.xaxis_signal ?? ""}
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
                    <td className="text-label">{t("config.estimated_duration")}</td>
                    <td></td>
                    <td className="label-estimated-duration text-label">{estimatedDuration}</td>
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
            if (newState.config.sampling_rate !== null) {
                if (typeof newState.config.decimation === "string")
                    newState.config.decimation = parseInt(newState.config.decimation as string)
                if (isNaN(newState.config.decimation)) {
                    newState.config.decimation = 0
                }

                if (
                    newState.config.decimation > 0 &&
                    newState.config.sampling_rate.type == "fixed_freq" &&
                    newState.config.sampling_rate.frequency
                ) {
                    newState.config.effective_sampling_rate = newState.config.sampling_rate.frequency / newState.config.decimation + ""
                } else {
                    newState.config.effective_sampling_rate = "N/A"
                }
            }

            prevState.onChange(newState.config)
            return newState
        default:
            throw new Error("invalid action")
    }
}

function useEstimatedDuration({ sampling_rate, decimation, xaxis_type, xaxis_signal, yaxis }: GraphConfig): string {
    const { deviceDataloggingCapabilities } = useScrutinyStatus()
    const datastore = useScrutinyDatastore()
    let new_duration_label = "N/A"

    // ensure this is refreshed if the datastore wasn't ready and then becomes ready
    const [entryTypeCacheBusting, setEntryTypeCacheBusting] = useState(0)
    const { listen } = useEventManager()

    // this will force a re-render if some entry types were not ready on the original render, but becomes ready later
    useEffect(() => {
        const requiredEntryTypes = [] as DatastoreEntryType[]
        if (xaxis_signal) requiredEntryTypes.push(xaxis_signal.entry_type)
        for (const axis of yaxis) {
            for (const signal of axis.signals) {
                if (!requiredEntryTypes.includes(signal.entry_type)) {
                    requiredEntryTypes.push(signal.entry_type)
                }
            }
        }
        const unregisterCallbacks = [] as Array<{ (): void }>
        for (const requiredEntryType of requiredEntryTypes) {
            if (!datastore.is_ready(requiredEntryType)) {
                unregisterCallbacks.push(
                    listen("scrutiny.datastore.ready", (data: { entry_type: DatastoreEntryType }) => {
                        if (data.entry_type === requiredEntryType) setEntryTypeCacheBusting(entryTypeCacheBusting + 1)
                    })
                )
            }
        }
        return () => unregisterCallbacks.forEach((cb) => cb())
    }, [entryTypeCacheBusting, setEntryTypeCacheBusting, listen, datastore, xaxis_signal, yaxis])

    // Can't compute anything if we don't know what we can do.
    if (deviceDataloggingCapabilities !== null) {
        const entry_id_set = new Set()
        if (deviceDataloggingCapabilities.encoding == "raw") {
            let size_per_sample = 0
            if (xaxis_type == "measured_time") {
                size_per_sample += 4
            } else if (xaxis_type == "signal" && xaxis_signal) {
                const xaxisSignalEntry = datastore.get_entry(xaxis_signal.entry_type, xaxis_signal.display_path)
                if (xaxisSignalEntry) {
                    size_per_sample += get_typesize_bytes(xaxisSignalEntry.datatype)
                }
            }
            // sampling rate and decimation will be null if invalid. frequency null if variable frequency rate
            if (sampling_rate != null && decimation != null && sampling_rate.frequency !== null) {
                // TODO
                let bad_entry = false
                for (const axis of yaxis) {
                    for (const signal of axis.signals) {
                        const entry = datastore.get_entry(signal.entry_type, signal.display_path)
                        if (entry == null) {
                            bad_entry = true
                            break
                        }
                        // Do not count duplicates
                        if (!entry_id_set.has(entry.server_id)) {
                            entry_id_set.add(entry.server_id)
                            size_per_sample += get_typesize_bytes(entry.datatype)
                        }
                    }
                    if (bad_entry) {
                        break
                    }
                }
                if (!bad_entry && size_per_sample > 0) {
                    const nb_samples = Math.floor(deviceDataloggingCapabilities.buffer_size / size_per_sample - 1)
                    if (nb_samples > 0) {
                        let duration = (nb_samples / sampling_rate.frequency) * decimation
                        let units = "seconds"

                        if (duration < 1) {
                            duration *= 1000
                            units = "milliseconds"
                        }

                        if (duration < 1) {
                            duration *= 1000
                            units = "microseconds"
                        }

                        new_duration_label = `${duration.toFixed(1)} ${units} (${nb_samples} samples)`
                    }
                }
            }
        }
    }

    return new_duration_label
}

function get_typesize_bytes(dtype: ValueDataType): number {
    if (!(dtype in TYPEMAP)) {
        throw "Cannot determine data type size from type " + dtype
    }
    return TYPEMAP[dtype]
}

function number2str(x: number, max_digits: number = 13): string {
    return x.toFixed(max_digits).replace(/\.?0*$/, "")
}
