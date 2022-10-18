var loggers = {}
var default_formatter = function(level, logger, message){
    return `[${level}] <${logger}> ${message}`
}

class Logger{
    constructor(name){
        this.name = name
        this.enabled = true
        this.formatter = default_formatter
    }

    log(msg){
        if (this.enabled){
            console.log(this.formatter('log', this.name, msg))
        }
    }
    debug(msg){
        if (this.enabled){
            console.debug(this.formatter('debug', this.name, msg))
        }
    }
    info(msg){
        if (this.enabled){
            console.info(this.formatter('info', this.name, msg))
        }
    }
    warning(msg){
        if (this.enabled){
            console.warning(this.formatter('warning', this.name, msg))
        }
    }
    error(msg){
        if (this.enabled){
            console.error(this.formatter('error', this.name, msg))
        }
    }

    disable(){
        this.enabled=false
    }

    enable(){
        this.enabled=true
    }

    set_formatter(formatter){
        this.formatter=formatter
    }
}

export default class LoggingModule {
    static getLogger(name){
        if (!loggers.hasOwnProperty(name)){
            loggers[name] = new Logger(name)
        }

        return loggers[name]
    }

    set_formatter(formatter){
        default_formatter = formatter
        let logger_names = Object.keys(loggers)
        for (let i=0; i<logger_names.length; i++){
            loggers[logger_names[i]].set_formatter(formatter)
        }
    }
}
