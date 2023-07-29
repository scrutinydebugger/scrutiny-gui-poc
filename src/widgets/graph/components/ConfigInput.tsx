import { Icon, Tooltip } from "@blueprintjs/core"
import { PropsWithChildren } from "react"
import { useIndent } from "../../shared/Indent"
import { ConfigLabel } from "./ConfigLabel"
import { ConfigDescription } from "./ConfigDescription"
import { ConfigOptions } from "./ConfigOptions"

export function ConfigInput({ name, children }: { name: string } & PropsWithChildren) {
    const indent = useIndent()
    return (
        <tr>
            <td style={{ paddingLeft: indent + "px" }}>
                <ConfigLabel name={name}></ConfigLabel>
            </td>

            <Tooltip
                content={
                    <>
                        <ConfigDescription name={name}></ConfigDescription>
                        <ConfigOptions name={name}></ConfigOptions>
                    </>
                }
                targetTagName="td"
            >
                <Icon icon="help"></Icon>
            </Tooltip>
            <td>{children}</td>
        </tr>
    )
}
