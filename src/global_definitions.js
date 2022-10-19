export var DatastoreEntryType = {
    Var: "var",
    Alias: "alias",
    RPV: "rpv",
}

export var AllDatastoreEntryTypes = []

let keys = Object.keys(DatastoreEntryType)
for (let i = 0; i < keys.length; i++) {
    AllDatastoreEntryTypes.push(DatastoreEntryType[keys[i]])
}

export var ServerStatus = {
    Disconnected: "disconnected",
    Connecting: "connecting",
    Connected: "connected",
}

export var DeviceStatus = {
    NA: "unkown",
    Disconnected: "disconnected",
    Connecting: "connecting",
    Connected: "connected",
}
