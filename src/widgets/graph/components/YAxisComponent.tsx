import { Button } from "@blueprintjs/core"
import { YAxis } from "../types/GraphConfig"
import { Editable } from "../../watch/components/Editable"
import { useWidgetState } from "../../shared/BaseWidget"
import { NestedStateFolder } from "../../shared/useNestedState"
import { YAxisSignalComponent } from "./YAxisSignalComponent"
import { useDrop } from "react-dnd"
import { WatchEntryType } from "../../watch/types/WatchEntryType"
import { useCallback } from "react"

export function YAxisComponent(props: { removeEntry: { (): void } }) {
    const [label, setLabel] = useWidgetState("label", "Axis 1")
    const [signals, setSignals] = useWidgetState("signals", [] as YAxis["signals"])
    const [{ isOver, canDrop }, drop] = useDrop(
        () => ({
            accept: ["scrutiny.entry"],
            drop(item: WatchEntryType, monitor) {
                if (monitor.didDrop()) return
                const { display_path, entry_type, name } = item.props
                setSignals([
                    ...signals,
                    {
                        display_path,
                        entry_type,
                        label: name ?? display_path.substring(display_path.lastIndexOf("/") + 1),
                    },
                ])
                return { action: "used" }
            },
            collect(monitor) {
                return {
                    isOver: monitor.isOver(),
                    canDrop: monitor.canDrop(),
                }
            },
        }),
        [signals, setSignals]
    )
    const tdStyle = isOver ? { backgroundColor: "gainsboro" } : canDrop ? { backgroundColor: "gray" } : {}
    const removeSignal = useCallback(
        (index: number) => {
            signals.splice(index, 1)
            setSignals([...signals])
        },
        [signals, setSignals]
    )
    return (
        <tbody ref={drop}>
            <tr>
                <td style={tdStyle}>
                    <Editable value={label} onChange={setLabel}></Editable>
                </td>
                <td style={tdStyle}>
                    <Button minimal={true} small={true} icon="trash" onClick={props.removeEntry}></Button>
                </td>
            </tr>

            {signals.map((signal, idx) => (
                <NestedStateFolder name={`signals/${idx}`} key={idx}>
                    <YAxisSignalComponent removeEntry={() => removeSignal(idx)}></YAxisSignalComponent>
                </NestedStateFolder>
            ))}
        </tbody>
    )
}
