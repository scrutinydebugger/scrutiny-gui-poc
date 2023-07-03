import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Datastore } from "./datastore";
import { useEventManager } from "../EventManager";
import { ServerConnection } from "./server_connection";
import { getLogger } from "./logging";
import { DeviceInformation, ScrutinyFirmwareDescription } from "./server_api";

interface ScrutinyContextInterface {
  datastore: Datastore;
  serverConnection: ServerConnection;
  status: {
    serverStatus: null | string;
    deviceInfo: null | DeviceInformation;
    deviceStatus: null | string;
    loadedSFD: null | ScrutinyFirmwareDescription;
  };
}
export const ScrutinyContext = createContext<null | ScrutinyContextInterface>(
  null
);

export default function ScrutinyServer(props: PropsWithChildren) {
  const { listen, trigger } = useEventManager();

  const datastore = useMemo(
    () => new Datastore({ listen, trigger }),
    [listen, trigger]
  );

  const serverConnection = useMemo(
    () =>
      new ServerConnection({
        datastore,
        listen,
        trigger,
        getLogger,
      }),
    [datastore, listen, trigger]
  );

  useEffect(() => {
    serverConnection.start();
    return () => {
      datastore.clear_silent();
      serverConnection.stop();
    };
  }, [serverConnection, datastore]);

  const [serverStatus, setServerStatus] = useState<null | string>(null);
  const [deviceInfo, setDeviceInfo] = useState<null | DeviceInformation>(null);
  const [deviceStatus, setDeviceStatus] = useState<null | string>(null);
  const [loadedSFD, setLoadedSFD] =
    useState<null | ScrutinyFirmwareDescription>(null);
  useEffect(
    () =>
      listen("scrutiny.ui.status", (data) => {
        setServerStatus(data.server.status);
        setDeviceInfo(data.device.info);
        setDeviceStatus(data.device.status);
        setLoadedSFD(data.loaded_sfd as ScrutinyFirmwareDescription);
      }),
    [listen]
  );

  return (
    <ScrutinyContext.Provider
      value={{
        datastore,
        serverConnection,
        status: { serverStatus, deviceInfo, deviceStatus, loadedSFD },
      }}
    >
      {props.children}
    </ScrutinyContext.Provider>
  );
}

export function useScrutiny() {
  const context = useContext(ScrutinyContext);
  if (context === null)
    throw new Error(
      "useScrutinyDatastore must be nested under a ScrutinyServer component"
    );

  return context;
}
export function useScrutinyDatastore() {
  return useScrutiny().datastore;
}
