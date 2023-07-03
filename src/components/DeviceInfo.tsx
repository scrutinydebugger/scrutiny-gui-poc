import React from "react";

import { useTranslation } from "react-i18next";
import "./styles/table.css";
import { DeviceInformation } from "../utils/ScrutinyServer/server_api";

const fields: Array<keyof DeviceInformation> = [
  "device_id",
  "display_name",
  "max_tx_data_size",
  "max_rx_data_size",
  "max_bitrate_bps",
  "rx_timeout_us",
  "heartbeat_timeout_us",
  "address_size_bits",
  "supported_feature_map",
  "readonly_memory_regions",
  "forbidden_memory_regions",
];

export default function DeviceInfo(
  props: Partial<DeviceInformation>
): React.JSX.Element {
  const { t } = useTranslation("common");

  return (
    <table className="styled-table">
      <tbody>
        {fields.map((field) => (
          <tr key={field}>
            <td>{t(`device_info.${field}.label`)}</td>
            <td>
              <DeviceInfoValue value={props[field]}></DeviceInfoValue>
            </td>
            <td>
              <img
                src="assets/img/question-mark-grey-64x64.png"
                width="32px"
                height="32px"
                title={t(`device_info.${field}.help`) ?? "n/a"}
                alt="help icon"
              ></img>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DeviceInfoValue(props: {
  value?: string | number | Record<string, any> | null;
}) {
  const { value } = props;
  if (typeof value === "string" || typeof value === "number")
    return <>{value}</>;
  else if (typeof value !== "object" || !value) return <>"-"</>;
  else if (value instanceof Array)
    return (
      <>
        {value.map((line) => (
          <>{line}</>
        ))}
      </>
    );
  const keys = Object.keys(value);
  return (
    <>
      {keys.map((key) => (
        <>
          {key}:{" "}
          {typeof value[key] === "boolean"
            ? value[key]
              ? "true"
              : "false"
            : value[key]}
          <br />
        </>
      ))}
    </>
  );
}
