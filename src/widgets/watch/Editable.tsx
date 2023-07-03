import { useEffect, useState } from "react";
import { useNestedState } from "../shared/useNestedState";
import { onKeyDown } from "./onKeyDown";

export function Editable({
  value,
  onChange,
  nestedStateKey,
}: {
  value: string;
  onChange: { (newValue: string): void };
  nestedStateKey: string;
}) {
  const [isEditing, setIsEditing] = useNestedState(
    "widget",
    nestedStateKey,
    false,
    { clearOnDefault: true }
  );

  if (isEditing) {
    return (
      <EditableEditing
        value={value}
        onChange={onChange}
        setIsEditing={setIsEditing}
      ></EditableEditing>
    );
  }

  return (
    <span
      style={{ cursor: "text" }}
      onDoubleClick={() => setIsEditing(!isEditing)}
    >
      {value}
    </span>
  );
}

function EditableEditing({
  onChange,
  value,
  setIsEditing,
}: {
  onChange: { (newValue: string): void };
  value: string;
  setIsEditing: { (status: boolean): void };
}) {
  const [ourValue, setOurValue] = useState(value);

  useEffect(() => {
    return onKeyDown("Escape", () => {
      setIsEditing(false);
      setOurValue(value);
    });
  }, [setIsEditing, setOurValue, value]);
  return (
    <form
      style={{ display: "inline-block" }}
      onSubmit={(ev) => {
        ev.preventDefault();
        onChange(ourValue);
        setIsEditing(false);
      }}
    >
      <input
        ref={(el) => {
          if (ourValue === value) el?.setSelectionRange(0, ourValue.length);
        }}
        type="text"
        value={ourValue}
        autoFocus
        onChange={(ev) => setOurValue(ev.target.value)}
        onBlur={() => {
          onChange(ourValue);
          setIsEditing(false);
        }}
      ></input>
    </form>
  );
}
