// @ts-check
"use strict"

interface Formatter {
    (level: string, logger_name: string, message: string): string
}

var loggers = {}
var default_formatter: Formatter = function (level, logger_name, message) {
    return `[${level}] <${logger_name}> ${message}`
}

/**
 * A Python-like logger class that can allow to cherry pick what is displayed on the console.
 */
class Logger {
    name: string
    enabled: boolean
    formatter: Formatter

    constructor(name: string) {
        this.name = name
        this.enabled = true
        this.formatter = default_formatter
    }

    log(msg: string): void {
        if (this.enabled) {
            console.log(this.formatter("log", this.name, msg))
        }
    }

    debug(msg: string): void {
        if (this.enabled) {
            console.debug(this.formatter("debug", this.name, msg))
        }
    }
    info(msg: string): void {
        if (this.enabled) {
            console.info(this.formatter("info", this.name, msg))
        }
    }

    warning(msg: string): void {
        if (this.enabled) {
            console.warn(this.formatter("warning", this.name, msg))
        }
    }

    error(msg: string): void {
        if (this.enabled) {
            console.error(this.formatter("error", this.name, msg))
        }
    }

    disable(): void {
        this.enabled = false
    }

    enable(): void {
        this.enabled = true
    }

    set_formatter(formatter: Formatter) {
        this.formatter = formatter
    }
}

export default class LoggingModule {
    /**
     * Returns the Logger object identified by the given name. Creates one if it does not already exists
     * @param name logger name
     * @returns the Logger with the given name
     */
    static getLogger(name) {
        if (!loggers.hasOwnProperty(name)) {
            loggers[name] = new Logger(name)
        }

        return loggers[name]
    }

    /**
     * Sets the formatter to all existing loggers and subsequently created logger objects
     * @param formatter Formatter to use
     */
    set_formatter(formatter: Formatter): void {
        default_formatter = formatter
        let logger_names = Object.keys(loggers)
        for (let i = 0; i < logger_names.length; i++) {
            loggers[logger_names[i]].set_formatter(formatter)
        }
    }
}
