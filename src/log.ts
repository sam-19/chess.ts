/**
 * Minimal scoped event log.
 *
 * Replaces the former `scoped-event-log` dependency, whose later versions pull in UI component libraries
 * (lit, Shoelace/Web Awesome) as runtime dependencies. The API is a compatible subset of it.
 */

/** Valid log message priority level. */
export type LogLevel = keyof typeof Log.LEVELS

export type LogEvent = {
    /** Numeric priority level (value of Log.LEVELS). */
    level: number
    message: string
    scope: string
    time: number
}

export type LogEventListener = (event: LogEvent) => unknown

export class Log {
    /** Log event priority levels (in ascending order). */
    static readonly LEVELS = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        DISABLE: 4,
    }
    /** Maximum number of events kept in the buffer; the oldest events are dropped first. */
    static maxEvents = 500
    protected static events: LogEvent[] = []
    protected static listeners: LogEventListener[] = []
    /** Events at and above this level will be printed to console. */
    protected static printThreshold = Log.LEVELS.WARN

    /**
     * Add a new event to the log at the given level.
     * @param level - Event priority as key of Log.LEVELS.
     * @param message - Message as a string or array of strings (where each item is its own line).
     * @param scope - Scope of the event.
     */
    static add (level: LogLevel, message: string | string[], scope: string) {
        const event: LogEvent = {
            level: Log.LEVELS[level],
            message: Array.isArray(message) ? message.join('\n') : message,
            scope,
            time: Date.now(),
        }
        Log.events.push(event)
        if (Log.events.length > Log.maxEvents) {
            Log.events.splice(0, Log.events.length - Log.maxEvents)
        }
        if (event.level >= Log.printThreshold && level !== 'DISABLE') {
            const text = `[${scope}] ${event.message}`
            if (level === 'ERROR') {
                console.error(text)
            } else if (level === 'WARN') {
                console.warn(text)
            } else if (level === 'INFO') {
                console.info(text)
            } else {
                console.debug(text)
            }
        }
        for (const listener of Log.listeners) {
            listener(event)
        }
    }

    /**
     * Add a listener that is called for every logged event, regardless of the print threshold.
     * @returns A function that removes the listener.
     */
    static addListener (listener: LogEventListener) {
        Log.listeners.push(listener)
        return () => {
            Log.listeners = Log.listeners.filter(l => l !== listener)
        }
    }

    static clear () {
        Log.events = []
    }

    static debug (message: string | string[], scope: string) {
        Log.add('DEBUG', message, scope)
    }

    static error (message: string | string[], scope: string) {
        Log.add('ERROR', message, scope)
    }

    /** Get a copy of all buffered events. */
    static getAllEvents () {
        return [...Log.events]
    }

    /** Get current event printing threshold. */
    static getPrintThreshold (): LogLevel {
        for (const [key, value] of Object.entries(Log.LEVELS)) {
            if (value === Log.printThreshold) {
                return key as LogLevel
            }
        }
        return 'DISABLE'
    }

    static info (message: string | string[], scope: string) {
        Log.add('INFO', message, scope)
    }

    /** Set the minimum level of events printed to console; `DISABLE` prints nothing. */
    static setPrintThreshold (level: LogLevel) {
        Log.printThreshold = Log.LEVELS[level]
    }

    static warn (message: string | string[], scope: string) {
        Log.add('WARN', message, scope)
    }
}

export default Log
