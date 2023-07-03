import { PropsWithChildren, createContext, useContext } from "react";

const IndentContext = createContext({ indent: 0, step: 10 });

export function Indent(props: { step?: number } & PropsWithChildren) {
  const context = useContext(IndentContext);
  const step = props.step ?? context.step;
  const indent = context.indent + step;
  return (
    <IndentContext.Provider value={{ indent, step }}>
      {props.children}
    </IndentContext.Provider>
  );
}

export function useIndent() {
  const { indent } = useContext(IndentContext);
  return indent;
}
