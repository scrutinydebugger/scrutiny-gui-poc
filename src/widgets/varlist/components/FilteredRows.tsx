import { useCallback, useEffect, useMemo, useState } from "react"
import { useScrutinyDatastore } from "../../../utils/ScrutinyServer"
import { DatastoreEntryType } from "../../../utils/ScrutinyServer/datastore"
import { EntryRow } from "./EntryRow"
import { useEventManager } from "../../../utils/EventManager"
import { findFuzzySections } from "../utils/findFuzzySections"

function useDatastoreFilteredEntries(entryType: DatastoreEntryType, searchPattern: RegExp) {
    const datastore = useScrutinyDatastore()

    const getThem = useCallback(
        function () {
            return datastore.all_display_path(entryType) //.filter((displayPath) => searchPattern.test(displayPath))
        },
        [datastore, entryType, searchPattern]
    )

    const [entries, setEntries] = useState<string[]>([])
    const { listen } = useEventManager()

    useEffect(() => {
        if (datastore.is_ready(entryType)) {
            setEntries(getThem())
        } else {
            return listen("scrutiny.datastore.ready", (data: { entry_type: DatastoreEntryType }) => {
                if (data.entry_type === entryType) setEntries(getThem())
            })
        }
    }, [datastore, listen, setEntries, entryType, getThem])

    return entries
}

export function FilteredRows(opts: { search: string }) {
    try {
        const pattern = opts.search
            .replaceAll(" ", "")
            .split("")
            .map((v) => v.replace(/([()\][.+*?])/, "\\$1"))
            .join(".*")
        const searchPattern = new RegExp(pattern, "i")
        return <FilteredRowsWithPattern search={opts.search} searchPattern={searchPattern}></FilteredRowsWithPattern>
    } catch (err) {
        return <>Error occured {`${err}`}</>
    }
}
function FilteredRowsWithPattern(opts: { searchPattern: RegExp; search: string }) {
    const noSpaceSearch = opts.search.replaceAll(" ", "")
    const alias = useDatastoreFilteredEntries(DatastoreEntryType.Alias, opts.searchPattern)
    const rpv = useDatastoreFilteredEntries(DatastoreEntryType.RPV, opts.searchPattern)
    const vars = useDatastoreFilteredEntries(DatastoreEntryType.Var, opts.searchPattern)
    const values: { displayPath: string; entryType: DatastoreEntryType; fuzzySplit: ReturnType<typeof findFuzzySections> }[] = [
        ...alias.map((displayPath) => ({ displayPath, entryType: DatastoreEntryType.Alias })),
        ...rpv.map((displayPath) => ({ displayPath, entryType: DatastoreEntryType.RPV })),
        ...vars.map((displayPath) => ({ displayPath, entryType: DatastoreEntryType.Var })),
    ]
        .map(({ displayPath, entryType }) => ({
            displayPath,
            entryType,
            fuzzySplit: findFuzzySections(displayPath, noSpaceSearch, true),
        }))
        .filter((a) => a.fuzzySplit.complete)
        .sort((a, b) => {
            if (a.fuzzySplit.exact) return -1
            else if (b.fuzzySplit.exact) return 1
            else if (a.fuzzySplit.sections.length === 0) return 1
            else if (b.fuzzySplit.sections.length === 0) return -1
            const diff = a.fuzzySplit.sections.length - b.fuzzySplit.sections.length
            if (diff !== 0) return diff
            return a.displayPath < b.displayPath ? -1 : a.displayPath === b.displayPath ? 0 : 1
        })
    return (
        <>
            {values.map(({ displayPath, entryType, fuzzySplit }) => (
                <EntryRow
                    key={`alias-${displayPath}`}
                    entryType={entryType}
                    displayPath={displayPath}
                    displayName={
                        <FuzzyHighlight key={displayPath} subject={displayPath} term={opts.search} fuzzySplit={fuzzySplit}></FuzzyHighlight>
                    }
                ></EntryRow>
            ))}
        </>
    )
}

function FuzzyHighlight(opts: { subject: string } & ({ term: string } | { fuzzySplit: ReturnType<typeof findFuzzySections> })) {
    const { sections, complete } = "fuzzySplit" in opts ? opts.fuzzySplit : findFuzzySections(opts.subject, opts.term)
    if (!complete) return <span style={{ opacity: 0.5 }}>{opts.subject}</span>

    const elements: JSX.Element[] = []
    let lastEnd = 0
    for (const { from, to } of sections) {
        if (from != lastEnd) elements.push(<span key={elements.length}>{opts.subject.substring(lastEnd, from)}</span>)
        elements.push(
            <span style={{ backgroundColor: "lightblue" }} key={elements.length}>
                {opts.subject.substring(from, to)}
            </span>
        )
        lastEnd = to
    }
    if (lastEnd < opts.subject.length) elements.push(<span key={elements.length}>{opts.subject.substring(lastEnd)}</span>)
    return <>{elements}</>
}
