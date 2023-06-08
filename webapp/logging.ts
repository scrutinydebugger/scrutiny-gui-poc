//    logging.ts
//        A python like logging module that allows fine-grain control over logging
//
//   - License : MIT - See LICENSE file.
//   - Project : Scrutiny Debugger (github.com/scrutinydebugger/scrutiny-gui-webapp)
//
//   Copyright (c) 2021-2023 Scrutiny Debugger

import { trim } from "./tools"

interface Formatter {
    (level: string, logger_name: string, message: string): string
}

var loggers: Record<string, Logger> = {}
var default_formatter: Formatter = function (level, logger_name, message) {
    return `[${level}] <${logger_name}> ${message}`
}

export enum Level {
    Debug = 10,
    Info = 20,
    Warning = 30,
    Error = 40,
}

export type LevelString = "debug" | "info" | "warning" | "error"

const LevelStr2Level: Record<LevelString, Level> = {
    debug: Level.Debug,
    info: Level.Info,
    warning: Level.Warning,
    error: Level.Error,
}

var default_level: Level = Level.Debug
/**
 * A Python-like logger class that can allow to cherry pick what is displayed on the console.
 */
export class Logger {
    name: string
    enabled: boolean
    level: Level
    formatter: Formatter

    constructor(name: string) {
        this.name = name
        this.enabled = true
        this.level = default_level
        this.formatter = default_formatter
    }

    /**
     * Change the logging level for this logger
     * @param level The logging level
     */
    set_level(level: Level | LevelString) {
        if (typeof level === "string") {
            this.level = levelStr_2_level(level)
        } else {
            this.level = level
        }
    }

    /**
     * Log to the console
     * @param msg The log message
     */
    log(msg: string): void {
        if (this.enabled) {
            console.log(this.formatter("log", this.name, msg))
        }
    }

    /**
     * Log a debug message
     * @param msg The log message
     */
    debug(msg: string): void {
        if (this.enabled && this.level <= Level.Debug) {
            console.debug(this.formatter("debug", this.name, msg))
        }
    }

    /**
     * Log an info message
     * @param msg The log message
     */
    info(msg: string): void {
        if (this.enabled && this.level <= Level.Info) {
            console.info(this.formatter("info", this.name, msg))
        }
    }

    /**
     * Log a warning message
     * @param msg The log message
     */
    warning(msg: string): void {
        if (this.enabled && this.level <= Level.Warning) {
            console.warn(this.formatter("warning", this.name, msg))
        }
    }

    /**
     * Log an error message
     * @param msg The log message
     */
    error(msg: string, param?: any): void {
        if (this.enabled && this.level <= Level.Error) {
            console.error(this.formatter("error", this.name, msg), param)
        }
    }

    /**
     * Disable this logger. Will prevent all messages to reach the console
     */
    disable(): void {
        this.enabled = false
    }

    /**
     * Enable this logger
     */
    enable(): void {
        this.enabled = true
    }

    /**
     * Change the formatter for this specific logger
     * @param formatter The formatter function
     */
    set_formatter(formatter: Formatter) {
        this.formatter = formatter
    }
}

/**
 * Converts a level string to a logging level numeric enum
 * @param level the level string
 * @returns Numeric level
 */
function levelStr_2_level(level: LevelString): Level {
    level = level.toLowerCase() as LevelString
    level = trim(level, " ") as LevelString

    if (typeof LevelStr2Level[level] === "undefined") {
        throw "Unknown logging level " + level
    }

    return LevelStr2Level[level]
}

/**
 * Returns the Logger object identified by the given name. Creates one if it does not already exists
 * @param name logger name
 * @returns the Logger with the given name
 */
export function getLogger(name: string) {
    if (!loggers.hasOwnProperty(name)) {
        loggers[name] = new Logger(name)
    }

    return loggers[name]
}

/**
 * Sets the formatter to all existing loggers and subsequently created logger objects
 * @param formatter Formatter to use
 */
export function set_formatter(formatter: Formatter): void {
    default_formatter = formatter
    let logger_names = Object.keys(loggers)
    for (let i = 0; i < logger_names.length; i++) {
        loggers[logger_names[i]].set_formatter(formatter)
    }
}

/**
 * Set the default logging level applied to all new loggers
 * @param level The logging level to apply
 */
export function set_default_level(level: Level | LevelString) {
    if (typeof level === "string") {
        default_level = levelStr_2_level(level)
    } else {
        default_level = level
    }
}

/**
 * Sets a new logging level to all existing loggers
 * @param level The logging level
 */
export function set_all_levels(level: Level | LevelString) {
    let logger_names = Object.keys(loggers)
    for (let i = 0; i < logger_names.length; i++) {
        loggers[logger_names[i]].set_level(level)
    }
}
