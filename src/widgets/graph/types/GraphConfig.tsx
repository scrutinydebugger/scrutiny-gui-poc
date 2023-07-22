import { Datalogging } from "../../../utils/ScrutinyServer/server_api"
import { WatchableType } from "../components/Watchable"

export interface GraphConfig {
    config_name: string
    sampling_rate: string | any
    decimation: number
    effective_sampling_rate: string
    probe_location: number
    timeout: string
    xaxis_type: string
    xaxis_signal: string | WatchableType
    trigger_type: Datalogging.TriggerType
    operand1: string | WatchableType
    operand2: string | WatchableType
    operand3: string | WatchableType
    trigger_hold_time: number
}
