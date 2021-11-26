import Options from './options'
import { ChessLog } from '../types/log'

class Log implements ChessLog {
    // Static properties
    static readonly LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        DISABLE: 4,
    }
    // Instance properties
    static events: LogEvent[] = []
    static level: number = Options.Log.logLevel
    static prevTimestamp: number | null = null
    /**
     * Add a new message to the log at the given level.
     * @param level Log.LEVEL
     * @param message
     */
    static add (level: number, message: string) {
        if (Object.values(Log.LEVELS).indexOf(level) === -1) {
            // Not a valid logging level
            console.warn(`Did not add an event with an invalid level to log: (${level}) ${message}`)
        } else {
            let logEvent = new LogEvent(level, message)
            if (level >= Log.level) {
                this.print(logEvent)
            }
            Log.events.push(logEvent)
            Log.prevTimestamp = logEvent.time.toTime()
        }
    }
    /**
     * Add a message at debug level to the log
     * @param message
     */
    static debug (message: string) {
        Log.add(Log.LEVELS.DEBUG, message)
    }
    /**
     * Add a message at error level to the log
     * @param message
     */
    static error (message: string) {
        Log.add(Log.LEVELS.ERROR, message)
    }
    /**
     * Get current logging level
     */
    static getLevel () {
        return Log.level
    }
    /**
     * Add a message at info level to the log
     * @param message
     */
    static info (message: string) {
        Log.add(Log.LEVELS.INFO, message)
    }
    /**
     * Print a log event's message to console
     * @param logEvent
     */
    static print (logEvent: LogEvent) {
        let message = []
        if (logEvent.scope) {
            message.push(`[${logEvent.scope}]`)
        }
        message = message.concat([logEvent.time.toString(), logEvent.message])
        if (logEvent.level === Log.LEVELS.DEBUG) {
            message.unshift('DEBUG')
            console.debug(message.join(' '))
        } else if (logEvent.level === Log.LEVELS.INFO) {
            // Keep the first part of the message always the same length
            message.unshift('INFO ')
            console.info(message.join(' '))
        } else if (logEvent.level === Log.LEVELS.WARN) {
            message.unshift('WARN ')
            console.warn(message.join(' '))
        } else if (logEvent.level === Log.LEVELS.ERROR) {
            message.unshift('ERROR')
            console.error(message.join(' '))
        }
    }
    static setLevel (level: number) {
        if (Object.values(Log.LEVELS).indexOf(level) !== -1) {
            Log.level = level
        } else {
            Log.warn(`Did not set invalid logging level ${level}`)
        }
    }
    /**
     * Add a message at warning level to the log
     * @param message
     */
    static warn (message: string) {
        Log.add(Log.LEVELS.WARN, message)
    }
}

// Auxiliary classes that are not meant to be exported

/**
 * A single event in the game log.
 */
class LogEvent {
    level: number
    message: string
    printed: boolean
    scope: string | undefined
    time: LogTimestamp

    constructor (level: number, message: string, scope?: string) {
        this.level = level
        this.message = message
        this.printed = false
        this.scope = scope
        this.time = new LogTimestamp()
    }
}
/**
 * Log event timestamp.
 */
class LogTimestamp {
    date: Date
    delta: number | null

    constructor () {
        this.date = new Date()
        this.delta = Log.prevTimestamp ? this.date.getTime() - Log.prevTimestamp : null
    }
    /**
     * Get a standard length datetime string from this timestamp
     * @param utc return as UTC time (default false)
     * @return YYYY-MM-DD hh:mm:ss
     */
    toString (utc=false) {
        let Y, M, D, h, m, s
        if (utc) {
            Y = this.date.getFullYear()
            M = (this.date.getMonth() + 1).toString().padStart(2, '0')
            D = this.date.getDate().toString().padStart(2, '0')
            h = this.date.getHours().toString().padStart(2, '0')
            m = this.date.getMinutes().toString().padStart(2, '0')
            s = this.date.getSeconds().toString().padStart(2, '0')
        } else {
            Y = this.date.getUTCFullYear()
            M = (this.date.getUTCMonth() + 1).toString().padStart(2, '0')
            D = this.date.getUTCDate().toString().padStart(2, '0')
            h = this.date.getUTCHours().toString().padStart(2, '0')
            m = this.date.getUTCMinutes().toString().padStart(2, '0')
            s = this.date.getUTCSeconds().toString().padStart(2, '0')
        }
        return `${Y}-${M}-${D} ${h}:${m}:${s}`
    }
    /**
     * Return timestamp as milliseconds
     */
    toTime () {
        return this.date.getTime()
    }
}

export default Log
