import { createContext } from "react"

let darkTheme = false
export const DarkThemeContext = createContext<{ darkTheme: boolean; setDarkTheme: { (state: boolean): void } }>({
    darkTheme,
    setDarkTheme: (v) => {
        darkTheme = v
    },
})
