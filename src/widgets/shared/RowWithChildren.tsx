import { useCallback, useMemo } from "react";
import { Indent } from "./Indent";
import { useNestedState } from "./useNestedState";
import { Expander } from "./Expander";

export function RowWithChildren(props: {
  row: {
    (props: {
      showChildren: boolean;
      setShowChildren: { (state: boolean): void };
      renderExpander: { (): JSX.Element };
    }): React.JSX.Element;
  };
  children: {
    (props: {}): React.JSX.Element;
  };
  showChildrenWidgetStateKey?: string;
}) {
  const { children: renderChildren } = props;
  const [showChildren, setShowChildren] = useNestedState(
    "widget",
    props.showChildrenWidgetStateKey ?? "showChildren",
    false,
    { clearOnDefault: true }
  );
  const children = useMemo(() => {
    return <>{showChildren && <Indent>{renderChildren({})}</Indent>}</>;
  }, [renderChildren, showChildren]);

  const renderExpander = useCallback(
    () => (
      <Expander
        setShowChildren={setShowChildren}
        showChildren={showChildren}
      ></Expander>
    ),
    [setShowChildren, showChildren]
  );
  return (
    <>
      {props.row({
        showChildren,
        setShowChildren,
        renderExpander,
      })}
      {children}
    </>
  );
}
