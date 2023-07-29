import { Datastore } from "../../../utils/ScrutinyServer/datastore"
import { Datalogging, Message } from "../../../utils/ScrutinyServer/server_api"
import { WatchableType } from "../components/Watchable"
import { NB_OPERANDS_MAP } from "../constants"
import { GraphConfig, YAxis } from "../types/GraphConfig"

type GraphConfigError = Partial<Record<keyof GraphConfig, string>> & {
    yaxis?: string
    yaxisSignals?: Array<{ yaxisIdx: number; signalIdx: number; error: string }>
}
/**
 * Make sure the configuration form is valid, show an error message if it is not and generates
 * a request object to send to the server
 * @returns The request to send to the server based on the config form
 */
export function configToRequest(
    config: GraphConfig,
    yaxis: YAxis[],
    datastore: Datastore
): { request: Partial<Message.C2S.RequestDataloggingAcquisition>; errors: null } | { request: null; errors: GraphConfigError } {
    const errors: GraphConfigError = {}

    if (!config.config_name) config.config_name = "Graph"

    // Sampling rate, null if invalid
    if (config.sampling_rate === null) {
        errors["sampling_rate"] = "Invald value"
    }

    //Decimation, null if invalid
    if (config.decimation === null) {
        errors["decimation"] = "Invald value"
    }

    // probe location (trigger position). Null if invalid
    if (config.probe_location === null) {
        errors["probe_location"] = "Invald value"
    }

    // Acquisition timeout. Null if invalid. 0 to ignore
    if (config.timeout === null) {
        errors["timeout"] = "Invald value"
    }

    // Type of X-Axis + sampling rate selection.
    let x_axis_signal: Datalogging.SignalDefinition | null = null
    if (config.xaxis_type == "ideal_time" && config.sampling_rate !== null) {
        if (config.sampling_rate.type == "variable_freq") {
            errors["xaxis_type"] = "Unavailable with variable frequency"
        }
    } else if (config.xaxis_type === "signal") {
        if (config.xaxis_signal === null) {
            errors["xaxis_signal"] = "Missing watchable"
        } else {
            const entry = datastore.get_entry(config.xaxis_signal.entry_type, config.xaxis_signal.display_path)
            if (entry === null) {
                errors["xaxis_signal"] = "Cannot get datastore entry matching entry type and path"
            } else {
                x_axis_signal = {
                    id: entry.server_id,
                    name: config.xaxis_signal.label,
                }
            }
        }
    }

    // Read the type of trigger selected by the user
    if (config.trigger_hold_time === null) {
        errors["trigger_hold_time"] = "Invalid value"
    }

    // List of operands
    const operands_list: Datalogging.Operand[] = []

    // Expected operand count based on trigger type
    const nb_operands = NB_OPERANDS_MAP[config.trigger_type]
    const fields = ["operand1", "operand2", "operand3"].slice(0, nb_operands) as Array<"operand1" | "operand2" | "operand3">
    for (const field of fields) {
        if (config[field] === "") {
            errors[field] = "Invalid value"
        } else {
            operands_list.push(watchableToOperand(config[field], datastore))
        }
    }

    // Read the list of watchable dragged in the Axis region

    if (yaxis.length === 0) {
        // Need at least one axis
        errors["yaxis"] = "Missing Y-Axis"
    }

    // Get the datastore entry matching the element dropped by the user
    const signals = [] as Datalogging.AcquisitionRequestSignalDef[]
    yaxis.forEach((yaxis, yaxisIdx) => {
        yaxis.signals.forEach((signal, signalIdx) => {
            const entry = datastore.get_entry(signal.entry_type, signal.display_path)
            if (entry == null) {
                if (!errors.yaxisSignals) errors.yaxisSignals = []
                errors.yaxisSignals.push({ yaxisIdx, signalIdx, error: "Failed to retrieve datastore entry" })
            } else {
                signals.push({
                    axis_id: yaxisIdx,
                    id: entry.server_id,
                    name: signal.label,
                })
            }
        })
    })
    const parsedYaxis = yaxis.map((axis, id) => {
        return {
            id: id,
            name: axis.label,
        } as Datalogging.AxisDef
    })

    // If any of the user input is invalid, stop there and return null
    for (const k in errors) {
        return { errors, request: null }
    }

    // The server wants a value in seconds
    const hold_time_sec = config.trigger_hold_time !== null ? config.trigger_hold_time / 1000.0 : 0.0

    // Build a request for the server
    const request: Partial<Message.C2S.RequestDataloggingAcquisition> = {
        name: config.config_name,
        sampling_rate_id: (config.sampling_rate as Datalogging.SamplingRate).identifier,
        decimation: config.decimation,
        probe_location: config.probe_location / 100.0,
        timeout: parseInt(config.timeout),
        x_axis_type: config.xaxis_type,
        x_axis_signal: x_axis_signal,
        condition: config.trigger_type,
        operands: operands_list,
        trigger_hold_time: hold_time_sec,
        signals: signals,
        yaxis: parsedYaxis,
    }

    return { errors: null, request }
}

function watchableToOperand(value: string | WatchableType, datastore: Datastore): Datalogging.Operand {
    if (typeof value === "object" && value) {
        const entry = datastore.get_entry(value.entry_type, value.display_path)
        return { type: "watchable", value: entry.server_id }
    }
    return { type: "literal", value }
}
