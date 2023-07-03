import {
  useCallback,
  useContext,
  useMemo,
  createContext,
  PropsWithChildren,
} from "react";
import { NestedArrayIndexTranslator } from "../../utils/NestedArrayIndexTranslator";
import {
  walkObject,
  walkObjectDeleteValue,
  walkObjectGetValue,
  walkObjectSetValue,
} from "../../utils/walkObject";

/**
 * You should not need to use this directly.
 *
 * Used to make the rest of the hooks and component work
 */
export const NestedStateContext = createContext<{
  prefixKeys: Array<string | string[]>;
  stores: {
    [key: string]: {
      state: { [key: string]: any };
      setState: { (v: { [key: string]: any }): void };
    };
  };
}>({ stores: {}, prefixKeys: [] });

/**
 * Element to put around the component that needs access to this nested store
 * @param props.store name of the store, Multiple ones can be degined and
 * nested. Use the same store key to access the different store that were
 * provided
 * @param props.state The original value of the store
 * @param props.setState a callback to be called when the state changes
 */
export function NestedStateStore({
  children,
  store,
  state,
  setState,
}: {
  store: string;
  state: any;
  setState: { (state: any): void };
} & PropsWithChildren) {
  const context = useContext(NestedStateContext);
  return (
    <NestedStateContext.Provider
      value={{
        ...context,
        stores: {
          ...context.stores,
          [store]: { state, setState },
        },
      }}
    >
      {children}
    </NestedStateContext.Provider>
  );
}

/**
 * When within a NestedStateStore, this add values to the path prefix of any and
 * all entries to the store, forcing all components nested within to work on
 * those nested values
 * @param props.name path to travel to
 * @returns
 */
export function NestedStateFolder({
  children,
  name,
}: { name: string | string[] } & PropsWithChildren) {
  const context = useContext(NestedStateContext);
  return (
    <NestedStateContext.Provider
      value={{
        ...context,
        prefixKeys: [...context.prefixKeys, name],
      }}
    >
      {children}
    </NestedStateContext.Provider>
  );
}

/**
 * Returns the current nested state path, as defined by the use of 0 or many
 * NestedStateFolder. A pathSeparator can be provided to overwrite the default
 * "/"
 * @param pathSeparator
 * @returns
 */
export function useNestedStateFolder(pathSeparator?: string) {
  const context = useContext(NestedStateContext);
  return context.prefixKeys.join(pathSeparator ?? "/");
}
export function useNestedStatePath(
  key?: string | string[],
  pathSeparator?: string
) {
  const sep = pathSeparator ?? "/";
  const { prefixKeys } = useContext(NestedStateContext);
  const path = useMemo(
    () =>
      [...prefixKeys, key]
        .flat()
        .filter((k): k is string => !!k)
        .map((keys) => keys.split(sep))
        .flat(),
    [prefixKeys, key, sep]
  );
  return path;
}

export interface NestedStateDispatch {
  (...actions: NestedStateDispatchAction[]): void;
}

export type NestedStatePath = string[];
export type NestedStateArrayLocation = {
  path: NestedStatePath;
  location:
    | "append" // path MUST point to an array, value will be `push` to the array
    | "prepend" // path MUST point to an array, value will be `unshift` to the array
    | "after" // path MUST point to a value in an array, value will be `splice` before it
    | "before" // path MUST point to a value in an array, value will be `splice` after it
    | "replace"; // path MUST point to a value in an array, value will be `splice` in place of it
};
export type NestedStateLocation = NestedStateArrayLocation | NestedStatePath;
export type NestedStateDispatchAction = {
  action: "move";
  source: NestedStatePath;
  destination: NestedStateLocation;
};

/**
 * Similar to react's useState, but the value will be a part of the bigger
 * nestedState object.
 * @param store The store key to take the value from
 * @param key The attribute under which our desired value will be stored, based
 * on the folder we currently are under
 * @param defaultValue Similar to the argument of setState, this indicate the
 * value the state should be initialized with
 * @param opts.clearOnDefault When the value is set back to the original value
 * (based on a JSON.stringify version of it), then it will be dropped. This help
 * ensure the state stay's as lean as possible
 * @param opts.pathSeparator Define how the path should be broken down. Applies
 * to both the combined values of NestedStateFolder and the key provided in this
 * call
 * @param opts.absolutePath When true, the key will ignore any and all
 * NestedStateFolder
 * @returns [0] state: The current state
 * @returns [1] setState: a handle to be called to update the state value
 * @returns [2] dispatch: Used to make more complexe action on the nestedState, see NestedStateDispatchAction
 * @returns [3] path: The resulting path for the state worked on
 */
export function useNestedState<T>(
  store: string,
  key: string | string[],
  defaultValue: T,
  opts?: {
    // if set to true, will clear the state when the default value is re-assigned to the state
    // comparaison is made with a JSON.stringified version of the values
    clearOnDefault?: boolean;

    // what is the value to split the key on, if any. default to '/'
    pathSeparator?: string;

    // should the path ignore the current NestedStateFolder or not
    absolutePath?: boolean;
  }
): [T, { (value: T): void }, NestedStateDispatch, NestedStatePath] {
  const context = useContext(NestedStateContext);
  if (!(store in context.stores))
    throw new Error(
      `Unknown store ${store} in NestedStateContext. Please specify it with a NestedStateStore component`
    );

  const { state, setState } = context.stores[store];
  const clearOnDefault = opts?.clearOnDefault ?? false;
  const pathSeparator = opts?.pathSeparator ?? "/";
  const absolutePath =
    opts?.absolutePath ??
    (typeof key === "string" && key.substring(0, 1) === pathSeparator);
  const splitKey = useCallback(
    (key: string | string[]) =>
      typeof key === "string"
        ? pathSeparator
          ? key.split(pathSeparator)
          : [key]
        : key,
    [pathSeparator]
  );
  const serializedDefaultValue = JSON.stringify(defaultValue);
  const doClear = useCallback(
    (newValue: any) => {
      return (
        clearOnDefault && JSON.stringify(newValue) === serializedDefaultValue
      );
    },
    [clearOnDefault, serializedDefaultValue]
  );
  const nestedStatePath: NestedStatePath = useMemo(
    () =>
      [
        ...(absolutePath ? [] : context.prefixKeys.map(splitKey)),
        ...splitKey(key),
      ].flat(),
    [absolutePath, context.prefixKeys, key, splitKey]
  );

  const setValue = useCallback(
    (newValue: T) => {
      if (doClear(newValue)) {
        const newState = walkObjectDeleteValue({ ...state }, nestedStatePath);
        setState(newState);
      } else {
        const newState = { ...state };
        walkObjectSetValue(newState, nestedStatePath, newValue);
        setState(newState);
      }
    },
    [doClear, state, setState, nestedStatePath]
  );

  /**
   * Be careful when chaining actions that might affect the same tree, ex: if
   * you move item at index 3 of an array, and then of the same array, item at
   * index 5, that item would now be at 4. There's most likely a way to handle
   * this, but it is not handled in the code bellow
   */
  const nestedStateDispatch: NestedStateDispatch = useCallback(
    (...actions: NestedStateDispatchAction[]) => {
      setState(nestedStateDispatchHandle(state, ...actions));
    },
    [state, setState]
  );

  const value = walkObjectGetValue(state, nestedStatePath, defaultValue);

  return [value, setValue, nestedStateDispatch, nestedStatePath];
}

function isArray(val: any): val is Array<any> {
  if (val && typeof val === "object" && val instanceof Array) return true;
  return false;
}

/**
 * Reducer function for the Nested State
 * @param state
 * @param actions
 * @returns
 */
function nestedStateDispatchHandle(
  state: any,
  ...actions: NestedStateDispatchAction[]
) {
  const workState = { ...state };
  const idxTranslator = new NestedArrayIndexTranslator();
  for (const action of actions) {
    switch (action.action) {
      case "move":
        // remove the original value
        const value = walkObject(
          workState,
          action.source,
          ({ isLast, path, parent, key, $return, $setKey }) => {
            const thisIsAnArray = isArray(parent);
            const myKey = thisIsAnArray
              ? idxTranslator.translate(path, parseInt(key))
              : key;
            if (isLast) {
              if (thisIsAnArray) {
                $return(parent.splice(myKey as number, 1)[0]);
                idxTranslator.remove(path, myKey as number);
              } else {
                $return(parent[key]);
                delete parent[key];
              }
            } else if (thisIsAnArray) {
              $setKey("" + myKey);
            }
          }
        );
        if (typeof value === "undefined") {
          // do we need to abort?
          console.warn(
            "nestedStateDispatch value moved is undefined",
            action,
            state
          );
        }

        walkObject(
          state,
          isArray(action.destination)
            ? action.destination
            : action.destination.path,
          ({ parent, path, $setKey, key, isLast, isMissing }) => {
            const thisIsAnArray = isArray(parent);
            const myKey = thisIsAnArray
              ? idxTranslator.translate(path, parseInt(key))
              : key;
            if (thisIsAnArray) $setKey("" + myKey);

            if (isLast) {
              if (
                isArray(action.destination) ||
                action.destination.location === "replace"
              )
                parent[myKey] = value;
              else {
                switch (action.destination.location) {
                  case "append":
                  case "prepend":
                    if (!isArray(parent[myKey]))
                      throw new Error(
                        'nestedStateDispatch expect destination path to be an array when location is "append" or "prepend"'
                      );
                    const doPush = action.destination.location === "append";
                    idxTranslator.add(path, doPush ? parent[myKey].length : 0);
                    parent[myKey][doPush ? "push" : "unshift"](value);
                    break;
                  case "after":
                  case "before":
                    if (!thisIsAnArray) {
                      console.warn(state);
                      throw new Error(
                        'nestedStateDispatch expect destination path to be a value in an array when location is "after" or "before"'
                      );
                    }
                    const destIndex =
                      idxTranslator.translate(path, parseInt(key)) +
                      (action.destination.location === "after" ? 1 : 0);
                    idxTranslator.add(path, destIndex);
                    parent.splice(destIndex, 0, value);
                    break;
                  default:
                    throw new Error(
                      "nestedStateDispatch invalid destination location " +
                        action.destination.location
                    );
                }
              }
            } else if (isMissing) parent[myKey] = {};
          }
        );

        break;
      default:
        throw new Error("Invalid nestedStateDispatch action " + action.action);
    }
  }
  return workState;
}
