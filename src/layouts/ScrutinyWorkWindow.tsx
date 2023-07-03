import React from "react";
import StatusBar from "../components/StatusBar";
import MenuBar from "./MenuBar";
import SideMenu from "../components/SideMenu";
import { ScrutinyWindowArea } from "../components/ScrutinyWindowArea";

export function ScrutinyWorkWindow(props: {}): React.JSX.Element {
  return (
    <div className="scrutinyWorkWindow">
      <MenuBar></MenuBar>
      <SideMenu></SideMenu>
      <ScrutinyWindowArea></ScrutinyWindowArea>
      <StatusBar></StatusBar>
    </div>
  );
}
