import { useEffect, useState } from "react"
import { GraphConfig, YAxis } from "../types/GraphConfig"
import { useScrutinyStatus } from "../../../utils/ScrutinyServer/useScrutinyStatus"
import { useScrutinyDatastore } from "../../../utils/ScrutinyServer"
import { DatastoreEntryType } from "../../../utils/ScrutinyServer/datastore"
import { useEventManager } from "../../../utils/EventManager"
import { TYPEMAP } from "../constants"
import { ValueDataType } from "../../../utils/ScrutinyServer/server_api"

export function useEstimatedDuration({ sampling_rate, decimation, xaxis_type, xaxis_signal }: GraphConfig, yaxis: YAxis[]): string {
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
