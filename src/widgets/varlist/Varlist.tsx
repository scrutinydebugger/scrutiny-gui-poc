import { Button, Divider } from "@blueprintjs/core";
import { DatastoreEntryType } from "../../utils/ScrutinyServer/datastore";
import { BaseWidget, BaseWidgetProps } from "../shared/BaseWidget";
import { RootRow } from "./RootRow";
import { useTranslation } from "react-i18next";
import { useCallback, useContext } from "react";
import { MosaicContext, MosaicWindowContext } from "react-mosaic-component";

export function Varlist(props: BaseWidgetProps) {
  const { tileId, ...rest } = props;
  const { t } = useTranslation("widget:varlist");
  return (
    <BaseWidget
      {...rest}
      title={`${t("display_name")} #${tileId}`}
      toolbarControls={<ToolbarControls></ToolbarControls>}
    >
      <div className="varlist-content">
        <div className="varlist-tree-container">
          <table className="varlist-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th></th>
                <th style={{ width: "50px" }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(DatastoreEntryType).map((entryType) => (
                <RootRow key={entryType} entryType={entryType}></RootRow>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </BaseWidget>
  );
}

function ToolbarControls() {
  const {
    mosaicActions: { remove },
  } = useContext(MosaicContext);
  const {
    mosaicWindowActions: { getPath },
  } = useContext(MosaicWindowContext);

  const closeWindow = useCallback(() => {
    remove(getPath());
  }, [getPath, remove]);

  return (
    <>
      <Divider></Divider>
      <Button icon="cross" minimal={true} onClick={closeWindow}></Button>
    </>
  );
}
