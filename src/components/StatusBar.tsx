import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

import "./styles/status_bar.css";
import { IndicatorLight, IndicatorLightColor } from "./IndicatorLight";
import { useModal } from "./Modal";
import DeviceInfo from "./DeviceInfo";
import FirmwareDetails from "./FirmwareDetails";
import { useScrutinyStatus } from "../utils/ScrutinyServer/useScrutinyStatus";

export enum ConnectionStatuses {
  Disconnected = "disconnected",
  Connecting = "connecting",
  Connected = "connected",
}

function connectionStatusToIndicatorLightColor(
  status?: ConnectionStatuses | string | null
): IndicatorLightColor {
  switch (status ?? "") {
    case ConnectionStatuses.Connected:
      return "green";
    case ConnectionStatuses.Connecting:
      return "yellow";
    case ConnectionStatuses.Disconnected:
      return "red";
    default:
      return "grey";
  }
}

function StatusBarItem(
  props: { onClick?: { (): void } } & React.PropsWithChildren
) {
  const { children, ...rest } = props;
  return (
    <div className="status_bar_item" {...rest}>
      {children}
    </div>
  );
}

function VerticalSeperator() {
  return <div className="vertical_separator"></div>;
}

function ConnectionStatus(props: {
  label: string;
  status?: string | null;
  underlineConnected?: boolean;
}) {
  const { t, i18n } = useTranslation("common");
  const tentativeKey = `connection_status.${props.status}`;
  return (
    <>
      <IndicatorLight
        color={connectionStatusToIndicatorLightColor(props.status)}
      ></IndicatorLight>
      {props.label}:{" "}
      {!props.status ? (
        "---"
      ) : (
        <span
          style={
            props.underlineConnected && props.status === "connected"
              ? { textDecoration: "underline", cursor: "pointer" }
              : {}
          }
        >
          {i18n.exists(tentativeKey) ? t(tentativeKey) : props.status}
        </span>
      )}
    </>
  );
}

export default function StatusBar(): React.JSX.Element {
  const { t } = useTranslation("common");
  const { openAsModal } = useModal();
  const { serverStatus, deviceStatus, loadedSFD, deviceInfo } =
    useScrutinyStatus();

  const firmwareDetails = useMemo(
    () =>
      loadedSFD
        ? {
            project_name: loadedSFD.metadata.project_name,
            version: loadedSFD.metadata.version,
            author: loadedSFD.metadata.author,
            firmware_id: loadedSFD.firmware_id,
            generated_on: new Date(
              loadedSFD.metadata.generation_info.time * 1000
            ).toLocaleString(),
            // Scrutiny V0.0.1 & Python V3.10.0 on Linux
            generated_with:
              `Scrutiny V${loadedSFD.metadata.generation_info.scrutiny_version} &` +
              ` Python V${loadedSFD.metadata.generation_info.python_version} on` +
              ` ${loadedSFD.metadata.generation_info.system_type}`,
          }
        : {},
    [loadedSFD]
  );

  return (
    <div className="status_bar">
      <StatusBarItem>
        <ConnectionStatus
          label={t("status_bar.server_status")}
          status={serverStatus}
        ></ConnectionStatus>
      </StatusBarItem>

      <VerticalSeperator></VerticalSeperator>

      <StatusBarItem
        onClick={() => {
          openAsModal(
            t("status_bar.device_status"),
            <DeviceInfo {...(deviceInfo ?? {})}></DeviceInfo>
          );
        }}
      >
        <ConnectionStatus
          label={t("status_bar.device_status")}
          status={deviceStatus}
          underlineConnected={true}
        ></ConnectionStatus>
      </StatusBarItem>

      <VerticalSeperator></VerticalSeperator>

      <StatusBarItem
        onClick={() => {
          openAsModal(
            t("status_bar.loaded_firmware"),
            <FirmwareDetails {...firmwareDetails}></FirmwareDetails>
          );
        }}
      >
        {t("status_bar.loaded_firmware")}:{" "}
        <span
          style={
            loadedSFD ? { textDecoration: "underline", cursor: "pointer" } : {}
          }
        >
          {loadedSFD?.metadata.project_name ?? "-"}
        </span>
      </StatusBarItem>
    </div>
  );
}
