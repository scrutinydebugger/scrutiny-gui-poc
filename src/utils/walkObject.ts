export interface WalkObjectOnEachHandle<T> {
  (opts: {
    value: any;
    isLast: boolean;
    isMissing: boolean;
    $return: { (value: T): void }; // ends execution and return the value passed
    $setKey: { (key: string): void }; // change the key to be used to move to the next level
    key: string; // the key under which the value was found
    path: string[]; // the path traversed so far, without `key`
    parent: any; // the parent object from which the value was pulled at key value
  }): void;
}

export function walkObject<T>(
  obj: any,
  keys: string[],
  onEach: WalkObjectOnEachHandle<T>
): T {
  let level = obj;
  const path: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    const value = level[key];
    const isMissing = typeof value === "undefined";
    const isLast = i === keys.length - 1;
    let result: T | undefined = undefined,
      doReturn = false;
    const $return = (val: T) => {
      result = val;
      doReturn = true;
    };
    const $setKey = (newKey: string) => {
      key = newKey;
    };
    const parent = level;
    onEach({
      value,
      isLast,
      isMissing,
      $return,
      $setKey,
      key,
      parent,
      path,
    });
    if (doReturn || isLast) return result as T;

    if (key in level) {
      level = level[key];
      path.push(key);
    } else
      throw new Error(
        `Failed to walk object, key ${key} is missing from value at ${path.join(
          "/"
        )}`
      );
  }
  return undefined as T;
}

export function walkObjectGetValue<T>(
  obj: any,
  keys: string[],
  defaultValue: T
): T {
  return walkObject(obj, keys, ({ value, isLast, isMissing, $return }) => {
    if (isMissing) $return(defaultValue);
    else if (isLast) $return(value as T);
  });
}

export function walkObjectDeleteValue(obj: any, keys: string[]) {
  walkObject(obj, keys, ({ isLast, key, parent }) => {
    if (isLast) delete parent[key];
  });
  return obj;
}

export function walkObjectSetValue(obj: any, keys: string[], value: any) {
  walkObject(obj, keys, ({ isMissing, isLast, parent, key }) => {
    if (isLast) parent[key] = value;
    else if (isMissing) parent[key] = {};
  });
}
