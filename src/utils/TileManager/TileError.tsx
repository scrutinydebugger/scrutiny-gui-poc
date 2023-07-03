import React, { PropsWithChildren } from "react";

export function TileError(props: PropsWithChildren) {
  return <span style={{ color: "red" }}>{props.children}</span>;
}
