import { Button } from "@blueprintjs/core"
import { useCallback } from "react"
import { useTranslation } from "react-i18next"
import { YAxis } from "../types/GraphConfig"
import { useWidgetState } from "../../shared/BaseWidget"
import { NestedStateFolder } from "../../shared/useNestedState"
import { YAxisComponent } from "./YAxisComponent"

export function YAxesComponent() {
    const { t } = useTranslation("widget:graph")
    const [yaxis, setYaxis] = useWidgetState("config/yaxis", [] as YAxis[])

    const addAxis = useCallback(() => {
        let newLabelIdx = 1
        while (yaxis.find((y) => y.label === `Axis ${newLabelIdx}`)) newLabelIdx++
        setYaxis([...yaxis, { label: `Axis ${newLabelIdx}`, signals: [] }])
    }, [yaxis, setYaxis])

    const removeAxis = useCallback(
        (index: number) => {
            yaxis.splice(index, 1)
            setYaxis([...yaxis])
        },
        [yaxis, setYaxis]
    )

    return (
        <table style={{ display: "inline-block", verticalAlign: "top" }}>
            <thead>
                <tr>
                    <th>
                        <Button onClick={() => addAxis()}>{t("add_axis")}</Button>
                    </th>
                </tr>
            </thead>

            {yaxis.map((yaxis, idx) => (
                <NestedStateFolder name={`config/yaxis/${idx}`} key={idx}>
                    <YAxisComponent removeEntry={() => removeAxis(idx)}></YAxisComponent>
                </NestedStateFolder>
            ))}
        </table>
    )
}
