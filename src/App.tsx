import React from "react";
import "./App.css";
import { ModalContainer } from "./components/Modal";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ScrutinyWorkWindow } from "./layouts/ScrutinyWorkWindow";
import ScrutinyServer from "./utils/ScrutinyServer/ScrutinyServer";
import { tileTypes } from "./widgets/tileTypes";
import { TileManager } from "./utils/TileManager";

function App(): React.JSX.Element {
  const storage = window.sessionStorage;
  const storedValue = storage.getItem("tile-manager");
  const value = storedValue ? JSON.parse(storedValue) : null;
  return (
    <DndProvider backend={HTML5Backend} debugMode={true}>
      <TileManager
        tileTypes={tileTypes}
        value={value}
        onChange={(value) => {
          storage.setItem("tile-manager", JSON.stringify(value));
        }}
      >
        <ScrutinyServer>
          <ModalContainer>
            <div className="App">
              <ScrutinyWorkWindow></ScrutinyWorkWindow>
            </div>
          </ModalContainer>
        </ScrutinyServer>
      </TileManager>
    </DndProvider>
  );
}

export default App;
