import { BaseWidget, BaseWidgetProps } from "../shared/BaseWidget";
import { useTileManager } from "../../utils/TileManager";
import { useTranslation } from "react-i18next";
export function Debug(props: BaseWidgetProps) {
  const { mosaic, _tileData } = useTileManager();
  const { tileId, ...rest } = props;
  const { t } = useTranslation("widget:debug");
  return (
    <BaseWidget {...rest} title={`${t("display_name")} #${tileId}`}>
      <pre>
        Debug Information {"\n"}
        Mosaic:{JSON.stringify(mosaic, null, 4)}
        {"\n"}
        Tile Data:{JSON.stringify(_tileData, null, 4)}
      </pre>
    </BaseWidget>
  );
}
