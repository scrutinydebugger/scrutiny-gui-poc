//    global_definitions.ts
//        Some definitions used project wide
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2023 Scrutiny Debugger

export enum ServerStatus {
    Disconnected = "disconnected",
    Connecting = "connecting",
    Connected = "connected",
}

export enum DeviceStatus {
    NA = "unknown",
    Disconnected = "disconnected",
    Connecting = "connecting",
    Connected = "connected",
}

export enum DataloggerState {
    NA = "unknown",
    Standby = "standby",
    WaitForTrigger = "waiting_for_trigger",
    Acquiring = "acquiring",
    DataReady = "data_ready",
    Error = "error",
}
