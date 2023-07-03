import { Button, HTMLTable, MenuItem } from "@blueprintjs/core";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useModal } from "../../../components/Modal";
import { useTileManager } from "../../../utils/TileManager";
import { useDashboardStorage } from "../../../storage/useDashboardStorage";

export default function OpenDashboard(props: {
  setTitle: { (title: string): void };
}) {
  const { t } = useTranslation("common");
  const { openAsModal } = useModal();
  const title = t("menu.file.open_dashboard");
  const onClick = useCallback(() => {
    openAsModal(
      title,
      <OpenDashboardModal setTitle={props.setTitle}></OpenDashboardModal>
    );
  }, [title]);
  return (
    <MenuItem
      icon="document"
      onClick={onClick}
      text={t("menu.file.open_dashboard")}
    />
  );
}

function OpenDashboardModal({
  setTitle,
}: {
  setTitle: { (title: string): void };
}) {
  // list all dashboards
  const [importData, setImportData] = useState("");
  const { dispatch } = useTileManager();
  const { closeModal } = useModal();
  const { index, read, remove } = useDashboardStorage();
  const [selected, setSelected] = useState<string | null>(null);
  const loadEntry = useCallback(
    async (id: string) => {
      const entry = await read(id);
      dispatch({ action: "loadFromSerialized", serialized: entry.data });
      setTitle(entry.name);
      closeModal();
    },
    [read, setTitle]
  );
  const [details, setDetails] = useState<null | any>(null);
  const showDetails = useCallback(
    async (id: string | null) => {
      if (id === null) setDetails(null);
      else {
        const { data, ...rest } = await read(id);
        setDetails(rest);
      }
    },
    [read]
  );
  const sidePanelWidth = 300;
  return (
    <div style={{ position: "relative" }}>
      <HTMLTable
        striped={true}
        interactive={true}
        style={{ width: "calc( 100% - " + sidePanelWidth + "px )" }}
      >
        <thead>
          <tr>
            <th style={{ width: "32px" }}></th>
            <th>ID</th>
            <th>Name</th>
            <th>SDF</th>
            <th style={{ width: "200px" }}>Created On</th>
          </tr>
        </thead>
        <tbody>
          {index.map((entry) => (
            <tr
              key={entry.id}
              onDoubleClick={() => loadEntry(entry.id)}
              onClick={() => {
                const targetId = selected === entry.id ? null : entry.id;
                showDetails(targetId);
                setSelected(targetId);
              }}
              style={
                selected === entry.id ? { backgroundColor: "lightgreen" } : {}
              }
            >
              <td>
                <Button icon="trash" onClick={() => remove(entry.id)}></Button>
              </td>
              <td>{entry.id}</td>
              <td>{entry.name}</td>
              <td>{entry.sfdDesc}</td>
              <td>{entry.createdOn.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={3}>
              <textarea
                style={{ width: "100%" }}
                value={importData}
                onChange={(ev) => setImportData(ev.target.value)}
                placeholder="Paste content here to import"
              ></textarea>
            </th>
            <th>
              <Button
                disabled={!importData}
                onClick={() => {
                  dispatch({
                    action: "loadFromSerialized",
                    serialized: importData,
                  });
                  closeModal();
                }}
              >
                Import
              </Button>
            </th>
            <th>
              <Button
                disabled={selected === null}
                onClick={() => selected && loadEntry(selected)}
              >
                Open
              </Button>{" "}
              <Button onClick={() => closeModal()}>Cancel</Button>
            </th>
          </tr>
        </tfoot>
      </HTMLTable>
      {details && (
        <pre
          style={{
            position: "absolute",
            width: sidePanelWidth - 10 + "px",
            top: 0,
            right: 0,
            bottom: 0,
            paddingLeft: "15px",
            overflow: "auto",
          }}
        >
          {JSON.stringify(details.sfd, null, 4)}
        </pre>
      )}
      <hr />
    </div>
  );
}
