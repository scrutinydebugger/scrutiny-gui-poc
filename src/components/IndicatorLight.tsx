import React from "react";

export type IndicatorLightColor = "red" | "yellow" | "green" | "grey";

export function IndicatorLight(props: {
  color: IndicatorLightColor;
}): React.JSX.Element {
  return (
    <img
      src={`assets/img/indicator-${props.color}.png`}
      width="16px"
      height="16px"
      alt={`indicator ${props.color}`}
    />
  );
}
