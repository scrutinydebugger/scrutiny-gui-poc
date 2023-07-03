import React from "react";

export function BlankTile() {
  return (
    <table
      style={{
        textAlign: "center",
        height: "100%",
        width: "100%",
      }}
    >
      <tbody>
        <tr>
          <td>Please select a widget from the left</td>
        </tr>
      </tbody>
    </table>
  );
}
