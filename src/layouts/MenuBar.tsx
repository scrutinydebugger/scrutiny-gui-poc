import React, { useContext } from "react"
import { Button, Menu, MenuDivider, Popover, PopupKind } from "@blueprintjs/core"
import { useTranslation } from "react-i18next"
import SaveDashboard from "./menu/File/SaveDashboard"
import OpenDashboard from "./menu/File/OpenDashboard"
import Exit from "./menu/File/Exit"
import { useLocalStorage } from "../storage/useLocalStorage"
import { DarkThemeContext } from "../utils/DarkThemeContext"

export default function MenuBar(): React.JSX.Element {
    const { t } = useTranslation("common")
    const [title, setTitle] = useLocalStorage("session", "dashboard-title", "-")
    const { darkTheme, setDarkTheme } = useContext(DarkThemeContext)

    return (
        <div className="menu_bar">
            <MenuEntry
                label={t("menu.file.label")}
                content={
                    <Menu>
                        <OpenDashboard setTitle={setTitle}></OpenDashboard>
                        <SaveDashboard></SaveDashboard>
                        <MenuDivider></MenuDivider>
                        <Exit></Exit>
                    </Menu>
                }
            ></MenuEntry>
            <Button small={true} onClick={() => setDarkTheme(!darkTheme)}>
                {darkTheme ? "Light Mode" : "Dark Mode"}
            </Button>

            <div style={{ position: "absolute", top: 0, left: 400 }}>{title}</div>
            {/* 
    <div id="menubar_corner_filler"></div>
    <div class='vertical_separator'></div>
    <div class="menubar_item">
        <span class='menubar_label'>File</span>
    </div>
    <div class='vertical_separator'></div>
    <div class="menubar_item">
        <span class='menubar_label'>Server</span>
    </div>
    <div class='vertical_separator'></div>
    <div class="menubar_item">
        <span class='menubar_label'>Device</span>
    </div>
    <div class='vertical_separator'></div>
    <div class="menubar_item">
        <span class='menubar_label'>About</span>
    </div>
    <div class='vertical_separator'></div>
     */}
        </div>
    )
}

function MenuEntry({ content, label }: { content: React.JSX.Element; label: string }) {
    return (
        <Popover canEscapeKeyClose={true} minimal={true} placement="bottom" popupKind={PopupKind.MENU} content={content} usePortal={true}>
            <Button minimal={true} small={true}>
                {label}
            </Button>
        </Popover>
    )
}
