// @ts-check
"use strict"

export enum DatastoreEntryType {
    Var = "var",
    Alias = "alias",
    RPV = "rpv",
}

type DatastoreEntryTypeLiteral = DatastoreEntryType.Alias | DatastoreEntryType.RPV | DatastoreEntryType.Var

export var AllDatastoreEntryTypes = [] as DatastoreEntryType[]

let keys = Object.keys(DatastoreEntryType)
for (let i = 0; i < keys.length; i++) {
    AllDatastoreEntryTypes.push(DatastoreEntryType[keys[i]])
}

export enum ServerStatus {
    Disconnected = "disconnected",
    Connecting = "connecting",
    Connected = "connected",
}

export enum DeviceStatus {
    NA = "unkown",
    Disconnected = "disconnected",
    Connecting = "connecting",
    Connected = "connected",
}

export interface EnumDefinition {
    [index: string]: number
}

type sintType = "sint8" | "sint16" | "sint32" | "sint64" | "sint128" | "sint256"
type uintType = "uint8" | "uint16" | "uint32" | "uint64" | "uint128" | "uint256"
type floatType = "float8" | "float16" | "float32" | "float64" | "float128" | "float256"
type cfloatType = "cfloat8" | "cfloat16" | "cfloat32" | "cfloat64" | "cfloat128" | "cfloat256"

export type ValueDataType = sintType | uintType | floatType | cfloatType
