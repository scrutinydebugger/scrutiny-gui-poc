import { useCallback } from "react";
import { getStore } from "./getStore";
import { useLocalStorage } from "./useLocalStorage";

type WriteEntry<Details> = Details;
type ReadEntry<Details> = IndexEntry<Details> & Details;
type IndexEntry<Summary> = EntryMeta & Summary;

interface EntryMeta {
  id: string;
  createdOn: Date;
  modifiedOn: Date;
}

function reviver(key: string, value: any): any {
  switch (key) {
    case "createdOn":
    case "modifiedOn":
      if (typeof value === "string") return new Date(value);
      return value;
    default:
      return value;
  }
}

export function useManagedListLocalStorage<Summary, Details>(
  storeType: "local" | "session",
  keyPrefix: string,
  summarize: { (entry: Details): Summary }
) {
  const [meta, setMeta] = useLocalStorage(storeType, `${keyPrefix}-meta`, {
    nextId: 1,
  });
  const [index, setIndex] = useLocalStorage(
    storeType,
    `${keyPrefix}-index`,
    [] as Array<IndexEntry<Summary>>,
    reviver
  );
  const store = getStore(storeType);

  const toStoreKey = useCallback(
    (id: string) => `${keyPrefix}-entry-${id}`,
    [keyPrefix]
  );

  const read = useCallback(
    async (id: string): Promise<ReadEntry<Details>> => {
      const rawData = store.getItem(toStoreKey(id));
      if (!rawData) throw new Error(`${keyPrefix} Document id ${id} not found`);
      const data = JSON.parse(rawData, reviver);
      return data;
    },
    [store, toStoreKey, keyPrefix]
  );

  const create = useCallback(
    async (entry: WriteEntry<Details>): Promise<EntryMeta> => {
      const id = meta.nextId;
      const createdOn = new Date();
      const modifiedOn = createdOn;
      const entryMeta: EntryMeta = { id: "" + id, createdOn, modifiedOn };

      setMeta({ ...meta, nextId: id + 1 });
      setIndex([...index, { ...entryMeta, ...summarize(entry) }]);
      store.setItem(
        toStoreKey("" + id),
        JSON.stringify({ ...entry, ...entryMeta })
      );
      return entryMeta;
    },
    [meta, setMeta, index, setIndex, store, toStoreKey, summarize]
  );
  const update = useCallback(
    async (id: string, entry: WriteEntry<Details>): Promise<EntryMeta> => {
      const currentSummaryIndex = index.findIndex((idx) => idx.id === id);
      if (currentSummaryIndex < 0)
        throw new Error(`${keyPrefix} Document id ${id} not found`);
      const { createdOn } = index[currentSummaryIndex];
      const entryMeta = {
        id,
        createdOn,
        modifiedOn: new Date(),
      };
      index[currentSummaryIndex] = { ...entryMeta, ...summarize(entry) };
      setIndex([...index]);
      store.setItem(toStoreKey(id), JSON.stringify({ ...entry, ...entryMeta }));
      return entryMeta;
    },
    [index, summarize, setIndex, store, keyPrefix, toStoreKey]
  );
  const remove = useCallback(
    async (id: string): Promise<void> => {
      const currentSummaryIndex = index.findIndex((idx) => idx.id === id);
      if (currentSummaryIndex >= 0) {
        index.splice(currentSummaryIndex, 1);
        setIndex([...index]);
      }
      store.removeItem(toStoreKey(id));
    },
    [index, setIndex, store, toStoreKey]
  );

  const clear = useCallback(async (): Promise<number> => {
    // arbitrary long amount to prevent infinite loop, it should break
    // before this anyway, I assume something else will go wrong before we
    // hit 1M entries using this
    let deleteCount = 0;
    const prefix = `${keyPrefix}-`;
    setIndex(null);
    setMeta(null);
    for (let i = 0; i < 1000000; i++) {
      const k = store.key(i);
      if (k === null) break;
      if (k.startsWith(prefix)) {
        store.removeItem(k);
        deleteCount++;
        // redoing the key at the index we just removed
        i--;
      }
    }
    return deleteCount;
  }, [keyPrefix, setIndex, setMeta, store]);

  return {
    index,
    read,
    create,
    update,
    remove,
    clear,
    entryIdToStoreKey: toStoreKey,
  };
}
