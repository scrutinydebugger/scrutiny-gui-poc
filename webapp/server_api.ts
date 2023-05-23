//    server_api.ts
//        Definitions of the server websocket API
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2023 Scrutiny Debugger

type sintType = "sint8" | "sint16" | "sint32" | "sint64" | "sint128" | "sint256"
type uintType = "uint8" | "uint16" | "uint32" | "uint64" | "uint128" | "uint256"
type floatType = "float8" | "float16" | "float32" | "float64" | "float128" | "float256"
type cfloatType = "cfloat8" | "cfloat16" | "cfloat32" | "cfloat64" | "cfloat128" | "cfloat256"

export type ValueDataType = sintType | uintType | floatType | cfloatType | "boolean"
export type ServerDeviceStatus = "unknown" | "disconnected" | "connecting" | "connected" | "connected_ready"
export type WatchableType = "rpv" | "var" | "alias"

export namespace Datalogging {
    export type Encoding = "raw"
    export type SamplingRateType = "fixed_freq" | "variable_freq"
    export type XAxisType = "ideal_time" | "measured_time" | "signal"
    export type TriggerType = "true" | "eq" | "neq" | "gt" | "get" | "lt" | "let" | "cmt" | "within"
    export type OperandType = "literal" | "watchable"

    export interface Operand {
        type: OperandType
        value: number | string
    }

    export interface SignalDefinition {
        id: string
        name: string
    }

    export interface SamplingRate {
        identifier: number
        name: string
        frequency: number | null
        type: Datalogging.SamplingRateType
    }

    export interface Capabilities {
        buffer_size: number
        encoding: Datalogging.Encoding
        max_nb_signal: number
        sampling_rates: SamplingRate[]
    }

    export type DataloggerState = "unavailable" | "standby" | "waiting_for_trigger" | "acquiring" | "data_ready" | "error"
    export interface DataloggingStatus {
        datalogger_state: DataloggerState
        completion_ratio: number | null
    }

    export interface AxisDef {
        name: string
        id: number
    }

    export interface AcquisitionRequestSignalDef {
        id: string
        name: string
        axis_id: number
    }

    export interface SignalData {
        name: string
        data: number[]
        logged_element: string
    }

    export interface SignalDataWithAxis extends SignalData {
        axis_id: number
    }
}

export namespace Message {
    export interface BaseC2SMessage {
        cmd: string
        reqid: number
    }

    export interface BaseS2CMessage {
        cmd: string
        reqid: number | null
    }

    export namespace C2S {
        export interface GetWatchableList extends BaseC2SMessage {
            max_per_response: number
            filter?: {
                type?: WatchableType[]
            }
        }

        export interface RequestDataloggingAcquisition extends BaseC2SMessage {
            name: string | null
            sampling_rate_id: number
            decimation: number
            timeout: number
            trigger_hold_time: number
            probe_location: number
            condition: Datalogging.TriggerType
            operands: Datalogging.Operand[]
            yaxis: Datalogging.AxisDef[]
            signals: Datalogging.AcquisitionRequestSignalDef[]
            x_axis_type: Datalogging.XAxisType
            x_axis_signal: Datalogging.SignalDefinition | null
        }
        export interface ReadDataloggingAcquisitionContent extends BaseC2SMessage {
            reference_id: string
        }

        export interface ReadDataloggingAcquisitionContent extends BaseC2SMessage {
            reference_id: string
        }
    }

    export namespace S2C {
        export interface Empty extends BaseS2CMessage {}

        export interface Echo extends BaseS2CMessage {
            payload: string
        }

        export interface Error extends BaseS2CMessage {
            request_cmd: string
            msg: string
        }

        export interface GetWatchableList extends BaseS2CMessage {
            qty: Record<WatchableType, number>
            content: Record<WatchableType, WatchableEntryServerDefinition[]>
        }

        export interface InformServerStatus extends BaseS2CMessage {
            device_status: ServerDeviceStatus
            loaded_sfd: ScrutinyFirmwareDescription | null
            device_comm_link: DeviceCommLink | null
            device_datalogging_status: Datalogging.DataloggingStatus
            device_info: DeviceInformation
        }

        export interface WatchableUpdate {
            updates: {
                id: string
                value: number
            }[]
        }

        export interface GetDataloggingCapabilitiesResponse extends BaseS2CMessage {
            available: boolean
            capabilities: Datalogging.Capabilities | null
        }

        export interface RequestDataloggingAcquisition extends BaseS2CMessage {
            request_token: string
        }

        export interface InformDataloggingAcquisitionComplete extends BaseS2CMessage {
            request_token: string
            reference_id: string | null
            success: boolean
        }

        export interface ReadDataloggingAcquisitionContent extends BaseS2CMessage {
            reference_id: string
            yaxis: Datalogging.AxisDef[]
            signals: Datalogging.SignalDataWithAxis[]
            xdata: Datalogging.SignalData
        }
    }
}

export type EnumDefinition = Record<string, number>

export interface WatchableEntryServerDefinition {
    id: string
    display_path: string
    datatype: ValueDataType
    enum?: EnumDefinition
}

export interface ScrutinyFirmwareDescription {
    firmware_id: string
    metadata: {
        project_name: string
        version: string
        author: string
        generation_info: {
            time: number
            python_version: string
            scrutiny_version: string
            system_type: string
        }
    }
}

export interface DeviceCommLink {
    type: "udp" | "serial" // | "canBus" | "spi" | "dummy" | "tcp"
    config: DeviceCommUdpConfig | DeviceCommSerialConfig
}

export interface DeviceCommUdpConfig {
    host: string
    port: number
}

export interface DeviceCommSerialConfig {
    portname: string
    baudrate: number
    stopbits: number
    databits: number
    parity: string
}

export interface MemoryBlock {
    start: number
    end: number
}

export interface DeviceInformation {
    device_id: string
    display_name: string
    max_tx_data_size: number
    max_rx_data_size: number
    max_bitrate_bps: number
    rx_timeout_us: number
    heartbeat_timeout_us: number
    address_size_bits: number
    protocol_major: string
    protocol_minor: string

    supported_feature_map: {
        memory_read: boolean
        memory_write: boolean
        datalogging: boolean
        user_command: boolean
        _64bits: boolean
    }

    forbidden_memory_regions: MemoryBlock[]
    readonly_memory_regions: MemoryBlock[]
}
