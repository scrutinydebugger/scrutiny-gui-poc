import { useCallback, useState } from "react";
import { getStore } from "./getStore";

export function useLocalStorage<T>(
  storeType: "local" | "session",
  key: string,
  defaultValue: T,
  reviver?: { (key: string, value: any): any }
): [T, { (newValue: T | null): void }] {
  const store = getStore(storeType);
  const rawData = store.getItem(key);
  const [data, setData] = useState(
    rawData ? JSON.parse(rawData, reviver) : defaultValue
  );
  const writeData = useCallback(
    (newData: T | null) => {
      if (newData === null) store.removeItem(key);
      else store.setItem(key, JSON.stringify(newData));
      setData(newData);
    },
    [setData]
  );
  return [(data as T) ?? defaultValue, writeData];
}
