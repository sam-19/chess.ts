import { PlayerColor } from "./color"

interface TimeControlTimers {
    autoTimeout: boolean
    fields: TCFieldModel[]
    start: number
    lastMove: number
    pauses: [number, number | null][]
    end: number
    activePlayer: PlayerColor
    plyNum: number
    time: TCTimeValues
    reportTimer: number | undefined
    turnFirst: boolean
    firstMove: boolean
    reportFunction: ((timers: TCTimeValues) => void) | null

    /**
     * Add a new field to time controls
     * @param params
     * @return true if successful, array of errors if failure
     */
    addField: (params: TCFieldModel) => true | string[]

    /**
     * Continue a paused timer
     * @param timestamp set pause end time to timestamp value (optional, default Date.now())
     */
    continueTimer: (timestamp?: number) => void

    /**
     * Get a copy of elapsed and remaining timers (in milliseconds)
     * @return { elapsed: { w, b }, remaining: { w, b } }
     */
    copyTimers: () => TCTimeValues

    /**
     * Get time delay in seconds for the given ply.
     * @param plyNum (optional, default current ply number)
     * @return delay
     */
    getDelay: (plyNum?: number) => number

    /**
     * Get time increment in seconds for the given ply.
     * @param plyNum (optional, default current ply number)
     * @return increment
     */
    getIncrement: (plyNum?: number) => number

    /**
     * Get time limit addition in seconds for the given ply.
     * @param plyNum (optional, default current ply number)
     * @return limit
     */
    getLimitAddition: (plyNum?: number) => number

    /**
     * Get the time control report function.
     */
    getReportFunction: () => ((timers: TCTimeValues) => void) | null

    /**
     * Get the time delta (time passed) from last move (in milliseconds), taking into account timer delay and pauses.
     * @param timestamp reference timestamp (optional, default now)
     * @return time delta
     */
    getTimeDelta: (timestamp?: number) => number

    /**
     * Is the time control at given ply a hourglass type control.
     * @param plyNum (optional, default current ply number)
     * @return
     */
    isHourglass: (plyNum?: number) => boolean

    /**
     * Call when a move has been made. Will update player clock times running clock.
     * @param plyNum ply number of the FINISHED move (mandatory)
     * @param takeback is this a takeback move (default false)
     * @return times elapsed and remaining for both player (in milliseconds): { elapsed: { w, b }, remaining: { w, b } }
     */
    moveMade: (plyNum: number, takeback?: boolean) => TCTimeValues | { error: string }

    /**
     * Parse a given PGN TimeControl field descriptor
     * @param descriptor
     * @return { errors, warnings } from the parse
     */
    parseTimeControlString: (descriptor: string) => { errors: string[], warnings: string[] }

    /**
     * Pause the timer.
     * @param timestamp set pause start time to timestamp value (optional, default Date.now())
     */
    pauseTimer: (timestamp?: number) => void

    /**
     * Set the auto-timeout property.
     * @param value
     */
    setAutoTimeout: (value: boolean) => void

    /**
     * Set ply number to given value.
     * @param num
     */
    setPlyNum: (num: number) => void

    /**
     * Set a function that will be used to report the remaining time on regulard intervals.
     * @param reportFunction
     */
    setReportFunction: (reportFunction: ((timers: TCTimeValues) => void) | null) => void

    /**
     * Start the timer.
     * @param timestamp set start time to timestamp value (optional, default Date.now())
     * @param reportTime attempt to start a time reporting interval for White (optional, default true)
     */
    startTimer: (timestamp?: number, reportTime?: boolean) => { error?: string }

    /**
     * Stop the timer.
     * @param timestamp optional (default now)
     */
    stopTimer: (timestamp?: number) => void

    /**
     * Update the timer to give regular reports on clock time remaining.
     */
    updateReportTimer: () => void

    /**
     * Get a PGN TimeControl field compliant string representation of this TimeControl object.
     */
    toString: () => string
}

type TCFieldModel = {
    start: number
    end: number | null
    limit: number
    delay: number
    increment: number
    hourglass: boolean
}

interface TCTimeValues {
    elapsed: { [player: string]: number }
    remaining: { [player: string]: number }
}

export { TimeControlTimers, TCFieldModel, TCTimeValues }
