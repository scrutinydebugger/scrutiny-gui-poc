//    server_api.ts
//        Definitions of the server websocket API
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2022 Scrutiny Debugger

type sintType = "sint8" | "sint16" | "sint32" | "sint64" | "sint128" | "sint256"
type uintType = "uint8" | "uint16" | "uint32" | "uint64" | "uint128" | "uint256"
type floatType = "float8" | "float16" | "float32" | "float64" | "float128" | "float256"
type cfloatType = "cfloat8" | "cfloat16" | "cfloat32" | "cfloat64" | "cfloat128" | "cfloat256"

export type ValueDataType = sintType | uintType | floatType | cfloatType
export type ServerDeviceStatus = "unknown" | "disconnected" | "connecting" | "connected" | "connected_ready"
export type WatchableType = "rpv" | "var" | "alias"

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
    }

    export namespace S2C {
        export interface GetWatchableList extends BaseS2CMessage {
            qty: Record<WatchableType, number>
            content: Record<WatchableType, WatchableEntryServerDefinition[]>
        }

        export interface InformServerStatus extends BaseS2CMessage {
            device_status: ServerDeviceStatus
            loaded_sfd: ScrutinyFirmwareDescription | null
            device_comm_link: DeviceCommLink | null
            device_info: DeviceInformation
        }

        export interface WatchableUpdate {
            updates: {
                id: string
                value: number
            }[]
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
        memory_write: boolean
        datalog_acquire: boolean
        user_command: boolean
    }

    forbidden_memory_regions: MemoryBlock[]
    readonly_memory_regions: MemoryBlock[]
}
