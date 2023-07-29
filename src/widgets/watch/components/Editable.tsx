import { useEffect, useState } from "react"
import { onKeyDown } from "../hooks/onKeyDown"
import { useWidgetState } from "../../shared/BaseWidget"

export function Editable(props: { value: string; onChange: { (newValue: string): void }; nestedStateKey?: string }) {
    if (props.nestedStateKey) return <EditableFromNestedState {...(props as any)}></EditableFromNestedState>
    return <EditableWithoutNestedState {...props}></EditableWithoutNestedState>
}
function EditableFromNestedState(props: { value: string; onChange: { (newValue: string): void }; nestedStateKey: string }) {
    const [isEditing, setIsEditing] = useWidgetState(props.nestedStateKey, false, { clearOnDefault: true })
    return <EditableWithState {...props} isEditing={isEditing} setIsEditing={setIsEditing}></EditableWithState>
}

function EditableWithoutNestedState(props: { value: string; onChange: { (newValue: string): void } }) {
    const [isEditing, setIsEditing] = useState(false)
    return <EditableWithState {...props} isEditing={isEditing} setIsEditing={setIsEditing}></EditableWithState>
}

function EditableWithState({
    isEditing,
    setIsEditing,
    value,
    onChange,
}: {
    isEditing: boolean
    setIsEditing: { (state: boolean): void }
    value: string
    onChange: { (newValue: string): void }
}) {
    if (isEditing) {
        return <EditableEditing value={value} onChange={onChange} setIsEditing={setIsEditing}></EditableEditing>
    }

    return (
        <span style={{ cursor: "text" }} onDoubleClick={() => setIsEditing(!isEditing)}>
            {value}
        </span>
    )
}

function EditableEditing({
    onChange,
    value,
    setIsEditing,
}: {
    onChange: { (newValue: string): void }
    value: string
    setIsEditing: { (status: boolean): void }
}) {
    const [ourValue, setOurValue] = useState(value)

    useEffect(() => {
        return onKeyDown("Escape", () => {
            setIsEditing(false)
            setOurValue(value)
        })
    }, [setIsEditing, setOurValue, value])
    return (
        <form
            style={{ display: "inline-block" }}
            onSubmit={(ev) => {
                ev.preventDefault()
                onChange(ourValue)
                setIsEditing(false)
            }}
        >
            <input
                ref={(el) => {
                    if (ourValue === value) el?.setSelectionRange(0, ourValue.length)
                }}
                type="text"
                value={ourValue}
                autoFocus
                onChange={(ev) => setOurValue(ev.target.value)}
                onBlur={() => {
                    onChange(ourValue)
                    setIsEditing(false)
                }}
            ></input>
        </form>
    )
}
