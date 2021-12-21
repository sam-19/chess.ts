
/** List of valid logging levels. */
type ValidLevel = 0 | 1 | 2 | 3 | 4

/**
 * A static logger for application events.
 * 
 * All events are recorded, but only events of sufficient importance
 * are printed directly to console.
 * 
 * Includes levels for debug (0), info (1), warning (2), and error (3) messages.
 * 
 * @example
 * import AppLog from './log'
 * AppLog.setLevel(2) // Only log warnings (= 2) and errors (= 3) to console
 * AppLog.info('Application loading') // Does not print to console (info = 1)
 * AppLog.warn('Disabling log printing to console') // Prints to console (warning = 2)
 * AppLog.setLevel(4) // Don't print anything
 */

class AppLog {

    // Static properties
    
    /**
     * Verbosity of the logger (what messages end up in the console)
     * ```
     * 0 = log everything
     * 1 = log info messages and above
     * 2 = log warning and errors
     * 3 = log only errors
     * 4 = disable logging
     * ```
     */
    static readonly LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        DISABLE: 4,
    } as { [name: string ]: ValidLevel }

    // Instance properties

    static events: LogEvent[] = []
    static level: ValidLevel = 0
    static prevTimestamp: number | null = null

    /**
     * Add a new message to the log at the given level.
     * @param level AppLog.LEVEL
     * @param message
     */
    static add (level: ValidLevel, message: string) {
        if (Object.values(AppLog.LEVELS).indexOf(level) === -1) {
            // Not a valid logging level
            console.warn(`Did not add an event with an invalid level to log: (${level}) ${message}`)
        } else {
            let logEvent = new LogEvent(level, message)
            if (level >= AppLog.level) {
                this.print(logEvent)
            }
            AppLog.events.push(logEvent)
            AppLog.prevTimestamp = logEvent.time.toTime()
        }
    }

    /**
     * Add a message at debug level to the log
     * @param message
     */
    static debug (message: string) {
        AppLog.add(AppLog.LEVELS.DEBUG, message)
    }

    /**
     * Add a message at error level to the log
     * @param message
     */
    static error (message: string) {
        AppLog.add(AppLog.LEVELS.ERROR, message)
    }
    
    /**
     * Get current logging level
     */
    static getLevel () {
        return AppLog.level
    }

    /**
     * Add a message at info level to the log
     * @param message
     */
    static info (message: string) {
        AppLog.add(AppLog.LEVELS.INFO, message)
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
        if (logEvent.level === AppLog.LEVELS.DEBUG) {
            message.unshift('DEBUG')
            console.debug(message.join(' '))
        } else if (logEvent.level === AppLog.LEVELS.INFO) {
            // Keep the first part of the message always the same length
            message.unshift('INFO ')
            console.info(message.join(' '))
        } else if (logEvent.level === AppLog.LEVELS.WARN) {
            message.unshift('WARN ')
            console.warn(message.join(' '))
        } else if (logEvent.level === AppLog.LEVELS.ERROR) {
            message.unshift('ERROR')
            console.error(message.join(' '))
        }
    }

    /**
     * Set the level of logging events to display in console.
     * @param level new logging level
     */
    static setLevel (level: ValidLevel) {
        if (Object.values(AppLog.LEVELS).indexOf(level) !== -1) {
            AppLog.level = level
        } else {
            AppLog.warn(`Did not set invalid logging level ${level}`)
        }
    }

    /**
     * Add a message at warning level to the log
     * @param message
     */
    static warn (message: string) {
        AppLog.add(AppLog.LEVELS.WARN, message)
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
 * AppLog event timestamp.
 */
class LogTimestamp {
    date: Date
    delta: number | null

    constructor () {
        this.date = new Date()
        this.delta = AppLog.prevTimestamp ? this.date.getTime() - AppLog.prevTimestamp : null
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

export default AppLog
