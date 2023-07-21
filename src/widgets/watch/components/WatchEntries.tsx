import { WatchEntryType } from "../types/WatchEntryType"
import { WatchFolderType } from "../types/WatchFolderType"
import { WatchEntry } from "./WatchEntry"

export function WatchEntries({ entries }: { entries: Array<WatchEntryType | WatchFolderType | null> }) {
    return <>{entries.map((entry, index) => entry && <WatchEntry key={index} entry={entry} index={index}></WatchEntry>)}</>
}
