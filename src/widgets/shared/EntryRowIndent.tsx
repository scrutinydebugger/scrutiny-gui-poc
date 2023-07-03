import { useIndent } from "./Indent";

export function EntryRowIndent() {
  const indent = useIndent();

  return (
    <div
      style={{
        display: "inline-block",
        marginLeft: indent - 3 + "px",
      }}
    ></div>
  );
}
