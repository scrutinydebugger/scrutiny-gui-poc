import React from "react";
import { useTranslation } from "react-i18next";
import "./styles/table.css";
interface FirmwareDetailsProps {
  project_name?: string;
  version?: string;
  author?: string;
  firmware_id?: string;
  generated_on?: string;
  generated_with?: string;
}
const fields: Array<keyof FirmwareDetailsProps> = [
  "project_name",
  "version",
  "author",
  "firmware_id",
  "generated_on",
  "generated_with",
];

export default function FirmwareDetails(
  props: FirmwareDetailsProps
): React.JSX.Element {
  const { t } = useTranslation("common");
  return (
    <table className="styled-table">
      <tbody>
        {fields.map((field) => (
          <tr>
            <td>{t(`firmware_details.${field}.label`)}</td>
            <td>{props[field] ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
