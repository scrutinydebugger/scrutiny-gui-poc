import { Datalogging } from "../../../utils/ScrutinyServer/server_api"
import { WatchableType } from "../components/Watchable"

export interface GraphConfig {
    config_name: string
    sampling_rate: Datalogging.SamplingRate | null
    decimation: number
    effective_sampling_rate: string
    probe_location: number
    timeout: string
    xaxis_type: Datalogging.XAxisType
    xaxis_signal: null | WatchableType
    trigger_type: Datalogging.TriggerType
    operand1: string | WatchableType
    operand2: string | WatchableType
    operand3: string | WatchableType
    trigger_hold_time: number
    // yaxis: Array<YAxis>
}

export interface YAxis {
    label: string
    signals: Array<WatchableType>
}
