import { MenuItem } from "@blueprintjs/core";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export default function Exit() {
  const onClick = useCallback(() => {
    window.close();
  }, []);
  const { t } = useTranslation("common");
  return (
    <MenuItem
      icon="cross"
      disabled={true}
      onClick={onClick}
      text={t("menu.file.exit")}
    />
  );
}
