import { Button, MenuItem } from "@blueprintjs/core";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useModal } from "../../../components/Modal";
import { useDashboardStorage } from "../../../storage/useDashboardStorage";
import { useTileManager } from "../../../utils/TileManager";
import { useScrutinyStatus } from "../../../utils/ScrutinyServer/useScrutinyStatus";

export default function SaveDashboard() {
  const { t } = useTranslation("common");
  const title = t("menu.file.save_dashboard");
  const { openAsModal } = useModal();
  const onClick = useCallback(() => {
    openAsModal(title, <SaveDashboardModal></SaveDashboardModal>);
  }, [openAsModal, title]);
  return <MenuItem icon="floppy-disk" onClick={onClick} text={title} />;
}

function SaveDashboardModal() {
  const defaultName = "New Dashboard";
  const [name, setName] = useState(defaultName);
  const { closeModal } = useModal();
  const { create } = useDashboardStorage();
  const { serialize } = useTileManager();
  const data = serialize();

  const { loadedSFD } = useScrutinyStatus();

  return (
    <>
      <label>
        Name:{" "}
        <input
          ref={(el) => {
            if (el?.value === defaultName)
              el.setSelectionRange(0, el.value.length);
          }}
          value={name}
          onChange={(ev) => {
            setName(ev.target.value);
          }}
          autoFocus
        />
      </label>

      <Button
        disabled={!name}
        onClick={() =>
          create({ name, data, sfd: loadedSFD }).then(() => closeModal())
        }
        icon="floppy-disk"
      >
        Save
      </Button>
      <Button onClick={() => closeModal()}>Cancel</Button>
      <hr />
      <p>
        or Copy / paste the information in the area bellow and store it
        whereever you please.
      </p>
      <textarea
        value={data}
        ref={(el) => {
          el?.setSelectionRange(0, data.length);
        }}
      ></textarea>
    </>
  );
}
