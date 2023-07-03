import { useIndent } from "./Indent";

export function Expander(props: {
  showChildren: boolean;
  setShowChildren: { (state: boolean): void };
}) {
  const indent = useIndent();
  return (
    <div
      style={{ marginLeft: indent + "px" }}
      className={`stt-expander stt-expander-${
        props.showChildren ? "opened" : "closed"
      }`}
      onClick={() => props.setShowChildren(!props.showChildren)}
    ></div>
  );
}
