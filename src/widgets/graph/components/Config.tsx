import { HTMLSelect, InputGroup } from "@blueprintjs/core"
import { useReducer } from "react"
import { useTranslation } from "react-i18next"
import { Indent } from "../../shared/Indent"
import { GraphConfig, YAxis } from "../types/GraphConfig"
import { Watchable, WatchableType } from "./Watchable"
import { useScrutinyStatus } from "../../../utils/ScrutinyServer/useScrutinyStatus"

import { NB_OPERANDS_MAP } from "../constants"
import { useWidgetState } from "../../shared/BaseWidget"
import { useEstimatedDuration } from "./useEstimatedDuration"
import { ConfigInput } from "./ConfigInput"

export function Config({ value, onChange }: { value: GraphConfig; onChange: { (config: GraphConfig): void } }) {
    const { t } = useTranslation("widget:graph")
    const [{ config: state }, dispatch] = useReducer(graphConfigReducer, { config: value, onChange } as GraphConfigState)
    const [yaxis] = useWidgetState("config/yaxis", [] as YAxis[])
    const estimatedDuration = useEstimatedDuration(state, yaxis)
    const { deviceDataloggingCapabilities } = useScrutinyStatus()

    if (deviceDataloggingCapabilities && state.sampling_rate === null) {
        dispatch({
            action: "set",
            field: "sampling_rate",
            value: deviceDataloggingCapabilities?.sampling_rates[0] ?? null,
        })
    }

    // if deviceDataloggingCapabilities === null, disable "Acquire"
    return (
        <table style={{ display: "inline-block" }}>
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
                        <option disabled={state.sampling_rate?.type === "variable_freq"} value="measured_time">
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

interface GraphConfigDispatchActionSetValue<K extends keyof GraphConfig> {
    action: "set"
    field: K
    value: GraphConfig[K]
}

type GraphConfigDispatchAction<K extends keyof GraphConfig> = GraphConfigDispatchActionSetValue<K>

interface GraphConfigState {
    config: GraphConfig
    onChange: { (config: GraphConfig): void }
}

function graphConfigReducer<K extends keyof GraphConfig>(prevState: GraphConfigState, action: GraphConfigDispatchAction<K>) {
    switch (action.action) {
        case "set": {
            const newState: GraphConfigState = {
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
                    newState.config.sampling_rate.type === "fixed_freq" &&
                    newState.config.sampling_rate.frequency
                ) {
                    newState.config.effective_sampling_rate = newState.config.sampling_rate.frequency / newState.config.decimation + ""
                } else {
                    newState.config.effective_sampling_rate = "N/A"
                }
            }

            prevState.onChange(newState.config)
            return newState
        }
        default:
            throw new Error("invalid action")
    }
}

function number2str(x: number, max_digits: number = 13): string {
    return x.toFixed(max_digits).replace(/\.?0*$/, "")
}
