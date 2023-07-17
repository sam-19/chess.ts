import Color from './color'
import Options from './options'

import { TimeControlTimers, TCFieldModel, TCTimeValues } from '../types/timers'
import { PlayerColor } from '../types/color'

class ChessTimer implements TimeControlTimers {
    // Static properties
    /**
     * Default properties of a time control field. All time units are in seconds.
     * @param start The move number when this control comes into effect (mandatory).
     * @param end The move number when this control is in effect for the last time (optional, default null = indefinite).
     * @param limit Time limit to add on start turn to both players' clocks (optional, default 0).
     * @param delay Time delay before a player's clock starts running at the start of this turn (optional, default 0). Delay will affect the amount of time transferred in an hourglass type control.
     * @param increment Time increment to add to a player's clock when he finishes a move (optional, default 0).
     * @param hourglass Is this an hourglass type control (optional, default false).
     */
    static readonly FieldModel: TCFieldModel = {
        start: 0,
        end: null as number | null,
        limit: 0,
        delay: 0,
        increment: 0,
        hourglass: false
    }
    /**
     * The margin of error (in milliseconds) tolerated when checking if the timer has a full second remaining
     */
    static readonly MarginOfError = 5

    // Instance properties
    autoTimeout: boolean = Options.ChessTimer.autoTimeout
    fields: (typeof ChessTimer.FieldModel)[] = []
    start = 0
    lastMove = 0
    pauses: [number, number | null][] = []
    end = 0
    activePlayer: PlayerColor = Color.WHITE
    plyNum = 0
    time: Timers = new Timers()
    reportTimer: number | undefined = undefined
    turnFirst = true
    firstMove = true
    reportFunction: ((timers: Timers) => void) | null = null

    // TODO: Capped Fischer timing and Bronstein timing?
    constructor (descriptor?: string, reportFunction?: (timers: Timers) => void) {
        /** Fields are objects with the following structure\
          * { start: int, end: int, limit: int, hourglass: boolean, increment: int, delay: int }\
          * where start and end are turn numbers, all the rest are time in seconds
          */
        if (descriptor !== undefined) {
            this.parseTimeControlString(descriptor)
        }
        if (reportFunction !== undefined) {
            this.reportFunction = reportFunction
        }
    }

    addField (params: typeof ChessTimer.FieldModel) {
        const errors = []
        const field = {...ChessTimer.FieldModel} // Copy base mode
        // Start field is mandatory
        if (!Object.prototype.hasOwnProperty.call(params, 'start') || isNaN(params.start) || Math.round(params.start) !== params.start || params.start <= 0) {
            errors.push("Time control field must have a parameter start and its value must be a positive integer!")
        } else {
            field.start = Math.round(params.start)
        }
        // Rest of the fields are optional. Limit must be full seconds, delay and increment may be frational.
        if (Object.prototype.hasOwnProperty.call(params, 'end') && params.end && !isNaN(params.end)) {
            field.end = Math.round(params.end)
        }
        if (Object.prototype.hasOwnProperty.call(params, 'limit') && !isNaN(params.limit)) {
            field.limit = Math.round(params.limit)
        }
        if (Object.prototype.hasOwnProperty.call(params, 'delay') && !isNaN(params.delay)) {
            field.delay = params.delay
        }
        if (Object.prototype.hasOwnProperty.call(params, 'increment') && !isNaN(params.increment)) {
            field.increment = params.increment
        }
        if (Object.prototype.hasOwnProperty.call(params, 'hourglass')) {
            field.hourglass = params.hourglass ? true : false
        }
        // Check that all of the existing fields have an end property
        let noEndProp = 0
        for (let i=0; i<this.fields.length; i++) {
            if (this.fields[i].end === null) {
                // Add an ending turn value to the indefinite control
                if (!noEndProp) {
                    this.fields[i].end = field.start - 1
                }
                noEndProp++
            }
        }
        // Only one missing end value can be fixed
        if (noEndProp > 1) {
            errors.push("More than one previous time control fields were missing and end property!")
        }
        // Add the field if there were no errors
        if (!errors.length) {
            this.fields.push(field)
            return true
        } else {
            return errors
        }
    }

    continueTimer (timestamp=Date.now()) {
        if (this.pauses.length) {
            this.pauses[this.pauses.length - 1][1] = timestamp
        }
        this.updateReportTimer()
    }

    copyTimers () {
        return new Timers(this.time)
    }

    getDelay (plyNum=this.plyNum) {
        for (let i=0; i<this.fields.length; i++) {
            // Float approximation errors are a b***h, better compare integers
            if ((this.fields[i].start - 1)*2 <= plyNum &&
                (this.fields[i].end === null || (this.fields[i].end as number - 1)*2 > plyNum + 1)
            ) {
                return this.fields[i].delay
            }
        }
        return ChessTimer.FieldModel.delay
    }

    getIncrement (plyNum=this.plyNum) {
        for (let i=0; i<this.fields.length; i++) {
            if ((this.fields[i].start - 1)*2 <= plyNum &&
                (this.fields[i].end === null || (this.fields[i].end as number - 1)*2 > plyNum + 1)
            ) {
                return this.fields[i].increment
            }
        }
        return ChessTimer.FieldModel.increment
    }

    getLimitAddition (plyNum=this.plyNum) {
        for (let i=0; i<this.fields.length; i++) {
            if (((this.fields[i].start - 1)*2 === plyNum ||
                  // If the game, for some reason, starts with Black's move
                  (this.firstMove && (this.fields[i].start - 1)*2 + 1 === plyNum)
                ) && this.fields[i].limit
            ) {
                return this.fields[i].limit
            }
        }
        return ChessTimer.FieldModel.limit
    }

    getReportFunction () {
        return this.reportFunction
    }

    getTimeDelta (timestamp=Date.now()) {
        let timeDelta = timestamp - this.lastMove - this.getDelay()*1000
        // Take possible pause into account
        if (this.pauses.length) {
            let pauseTime = 0
            for (let i=0; i<this.pauses.length; i++) {
                // Use current timestamp as end time if pause is still on
                pauseTime += (this.pauses[i][1] || Date.now()) - this.pauses[i][0]
            }
            timeDelta -= pauseTime
        }
        if (timeDelta < 0) {
            // Cannot win back time with delay
            timeDelta = 0
        }
        return timeDelta
    }

    isHourglass (plyNum=this.plyNum) {
        for (let i=0; i<this.fields.length; i++) {
            if ((this.fields[i].start - 1)*2 <= plyNum &&
                (this.fields[i].end === null || (this.fields[i].end as number - 1)*2 > plyNum + 1)
            ) {
                return this.fields[i].hourglass
            }
        }
        return ChessTimer.FieldModel.hourglass
    }

    moveMade (plyNum: number, takeback=false) {
        if (plyNum !== this.plyNum) {
            return { error: "Time control ply number is out of sync with game state!" }
        }
        if (!this.fields.length) {
            return { error: "There are no fields set, cannot apply time control!" }
        }
        const timestamp = Date.now()
        if (this.start === 0) {
            // First move, start the clock, don't report White's time
            this.startTimer(timestamp, false)
            // Black's turn, so report Black's timer
            this.activePlayer = Color.BLACK
        } else {
            // Take possible delay into account in move time
            const timeDelta = this.getTimeDelta()
            const player = plyNum%2 ? Color.BLACK : Color.WHITE
            if (takeback) {
                // Deduct time from the player who took their turn back
                this.time.elapsed[Color.swap(player)] += timeDelta
                if (this.fields.length) {
                    // Delay does not apply to takeback moves
                    this.time.remaining[Color.swap(player)] -= timeDelta + this.getDelay()*1000
                }
            } else {
                this.time.elapsed[player] += timeDelta
                // Calculate remaining time only if there is an actual time control set
                if (this.fields.length) {
                    // Check for possible time limit increment.
                    // First limit is added at startTimer, so don't add it again.
                    const limit = this.firstMove ? 0 : this.getLimitAddition(plyNum)
                    if (limit) {
                        this.time.remaining[Color.WHITE] += limit*1000
                        this.time.remaining[Color.BLACK] += limit*1000
                    }
                    // Make the appropriate addition to remaining time
                    this.time.remaining[player] -= timeDelta - this.getIncrement()*1000
                    // Finally, check if this is an hourglass timer
                    if (this.isHourglass(plyNum)) {
                        this.time.remaining[Color.swap(player)] += timeDelta
                    }
                }
            }
            this.lastMove = timestamp
            this.activePlayer = Color.swap(player)
        }
        this.plyNum = plyNum + (takeback ? -1 : 1)
        this.pauses = [] // Remaining time has been saved, reset pauses
        this.turnFirst = true
        this.updateReportTimer()
        if (this.firstMove) {
            this.firstMove = false
        }
        return this.time
    }

    parseTimeControlString (descriptor: string) {
        // Field object base model
        // Remove old time controls
        // TODO: Way to append controls from additional fields?
        this.fields = []
        // Bullet time controls are the simplest
        const bullet = descriptor.match(/^(\d+)\|(\d+)$/) || descriptor.match(/^(\d+)\s?min$/)
        if (bullet) {
            const field = {...ChessTimer.FieldModel} // Copy base mode
            field.limit = parseInt(bullet[1], 10)*60 // Bullet uses minutes for limit
            if (bullet[2]) {
                field.increment = parseInt(bullet[2], 10)
            }
            field.start = 1
            this.fields.push(field)
            return { errors: [], warnings: [] }
        }
        // Descriptor fields can be separated by spaces, colons and/or commas
        const fields = descriptor.toLowerCase().split(/[:\s,]+/)
        const errors: string[] = []
        const warnings: string[] = []
        let delay = 0
        let increment = 0
        let turn = 1
        for (const params of fields) {
            const field = {...ChessTimer.FieldModel} // Copy base mode
            field.start = turn
            let turns = null
            let limit = null
            // Try different variations
            limit = params.match(/^sd\/?(\*?\d+)/)
            if (limit === null) {
                limit = params.match(/^g\/(\*?\d+)/)
            }
            if (limit === null) {
                turns = params.match(/^(\d*)\//)
                // Time limit can either be at the start of the field or follow turn count.
                // Using limit = (params.match(/\/(\d+)/) || params.match(/^(\d+)/)) may result in
                // errors in some sloppy descriptors (e.g. 20/+30) which the following way still
                // parses correctly.
                limit = turns === null ? params.match(/^(\*?\d+)/) : params.match(/\/(\*?\d+)/)
            }
            if (limit !== null) {
                // An asterisk before the number means that this is an hour glass time limit, catch this first
                if (limit[1].startsWith('*')) {
                    field.hourglass = true
                    limit[1] = limit[1].substring(1)
                }
                // There is a theoretical possibility that this could be zero, for example:
                // 20/3600:20/0+60:1800
                // 1 hour for the first 20 turns, 60 second increment (but no time limit addition)
                // for the next 20 turns, and a sudden death of 30min after that.
                // Even then, this should only be possible in the second or later fields
                // ... unless someone was sadistic enough to come up with something like 0d10.
                // Maybe it's better not to evaluate this at all...
                const numericLimit = parseInt(limit[1], 10)
                // We can make an assumption that apart from major tournaments, anything below
                // 10 probably means hours, from 10 to 100 minutes and above seconds.
                field.limit = (
                    numericLimit < 10
                    ? numericLimit*60*60
                    : numericLimit <= 100
                      ? numericLimit*60
                      :numericLimit
                )
                this.fields.push(field)
            } else if (turns !== null) {
                // It's not a breaking error, but turns should always be accompanied by a time limit,
                // so give a warning if it's missing
                warnings.push(`Time control limit value for field ${params} is missing, assumed 0`)
            }
            // Delay and increment terms are universal and apply to all stages
            const fieldDelay = params.match(/(^|[^s])d(\d*)/)
            const fieldIncrement = params.match(/\+(\d*)/)
            // None of these separators should have more than one match
            if ((params.match(/\//g) || []).length > 1 || (params.match(/\+/g) || []).length > 1 ||
                (params.match(/(^|[^s])d/g) || []).length > 1 || (params.match(/\*/g) || []).length > 1
            ) {
                errors.push(`Time control field ${params} is malformed, field omitted!`)
                // Do not continue parsing this field, but go through the rest of the fields to catch
                // other possible errors.
                continue
            }
            if (turns !== null) {
                // Field has fixed time per number of turns
                const turnCount = parseInt(turns[1])
                if (turnCount) {
                    field.end = turnCount + turn - 1
                    turn += turnCount // Increment turns for possible next field start
                } else {
                    // This should never be zero, it invalidates the whole field
                    errors.push(`Turn count in time control field ${params} evaluated as zero, field omitted!`)
                    continue
                }
            }
            if (fieldDelay !== null) {
                // Practically, the same game should not have both increment and delay, but accounting
                // for that possibility allows interesting experimentations like
                // 600 d30 +30 or even 0 d30 +30
                if (delay) {
                    // Delay and increment are universal, we should not encounter another one
                    warnings.push(`Time controls have more than one delay instruction, omitting D${fieldDelay[2]}`)
                } else {
                    delay = parseInt(fieldDelay[2])
                    // Add delay in its own field
                    this.fields.unshift({
                        delay: delay,
                        end: null,
                        hourglass: false,
                        increment: 0,
                        limit: 0,
                        start: 1,
                    })
                }
                if (!fieldDelay[2]) {
                    // There is no reason to mark this as zero, so it is probably a typo in the instruction
                    warnings.push(`Time delay value in time control field ${params} evaluated as zero.`)
                }
            }
            if (fieldIncrement !== null) {
                if (increment) {
                    warnings.push(`Time control has more than one increment instruction, omitting D${fieldIncrement[1]}`)
                } else {
                    increment = parseInt(fieldIncrement[1])
                    this.fields.unshift({
                        delay: 0,
                        end: null,
                        hourglass: false,
                        increment: increment,
                        limit: 0,
                        start: 1,
                    })
                }
                if (!fieldIncrement[1]) {
                    warnings.push(`Time increment value in time control field ${params} evaluated as zero.`)
                }
            }
        }
        if (!this.fields.length) {
            // Either the descriptor was empty or all fields were invalid
            warnings.push(`Time control descriptor ${descriptor} did not contain any valid time control fields`)
        }
        return { errors: errors, warnings: warnings }
    }

    pauseTimer (timestamp=Date.now()) {
        if (this.reportTimer !== null) {
            window.clearInterval(this.reportTimer)
            window.clearTimeout(this.reportTimer)
            this.reportTimer = undefined
        }
        this.pauses.push([timestamp, null])
    }

    setAutoTimeout (value: boolean) {
        this.autoTimeout = value
    }

    setPlyNum (num: number) {
        this.plyNum = num
    }

    setReportFunction (reportFunction: ((timers: Timers) => void) | null) {
        this.reportFunction = reportFunction
        if (reportFunction) {
            reportFunction(this.copyTimers())
        }
    }

    startTimer (timestamp=Date.now(), reportTime=true) {
        if (!this.fields.length) {
            return { error: "There are no fields set, cannot start time control!" }
        } else if (this.start !== 0) {
            return { error: "Timer has already been started!" }
        }
        this.start = timestamp
        const startLimit = this.getLimitAddition()
        if (startLimit) {
            this.time.remaining[Color.WHITE] = startLimit*1000
            this.time.remaining[Color.BLACK] = startLimit*1000
        }
        this.lastMove = timestamp
        this.turnFirst = true
        if (reportTime && this.reportFunction !== null) {
            // Report the initial timers
            this.reportFunction(this.copyTimers())
            // Start interval
            this.updateReportTimer()
        }
        return {}
    }

    stopTimer (timestamp=Date.now()) {
        if (this.reportTimer !== null) {
            window.clearInterval(this.reportTimer)
            window.clearTimeout(this.reportTimer)
            this.reportTimer = undefined
        }
        this.end = timestamp
    }

    updateReportTimer () {
        if (this.reportTimer !== null) {
            // Make sure we don't start multiple timers
            window.clearInterval(this.reportTimer)
            window.clearTimeout(this.reportTimer)
        }
        if (this.reportFunction === null) {
            return
        }
        // Different logic if we're reporting time remaining or time elapsed
        if (this.fields.length) {
            // Report remaining time if there are time controls set
            // Report once per second if more than 10 seconds remain, otherwise 10 times per second
            const remTime = this.time.remaining[this.activePlayer] - this.getTimeDelta()
            const interval = remTime > 10000 || remTime < 0 ? 1000 : 100
            const timeSurplus = remTime > 0 ? remTime%interval : remTime%interval + interval
            // Always set an individual timeout when turn changes and if the current player doesn't have full
            // seconds remaining (with a small tolerance for error)
            if (this.turnFirst || (timeSurplus > ChessTimer.MarginOfError &&
                interval - timeSurplus > ChessTimer.MarginOfError)
            ) {
                // Not a full second, set a timeout for the remaining fraction first
                this.reportTimer = window.setTimeout(() => {
                    const timers = this.copyTimers()
                    const timeDelta = this.getTimeDelta()
                    timers.elapsed[this.activePlayer] += timeDelta
                    timers.remaining[this.activePlayer] -= timeDelta
                    if (this.isHourglass()) {
                        // When in hourglass mode, report the increasing time on opponent as well
                        timers.remaining[Color.swap(this.activePlayer)] += timeDelta
                    } else if (this.plyNum && !this.getIncrement()) {
                        // Otherwise, don't report opponent time unless it gets and increment at move end
                        // (it looks strange if the time changes when it's not your turn)
                        delete timers.elapsed[Color.swap(this.activePlayer)]
                        delete timers.remaining[Color.swap(this.activePlayer)]
                    }
                    if (this.reportFunction) {
                        this.reportFunction(timers)
                    }
                    this.updateReportTimer()
                // Check if there is a delay set, because no point in reporting the time while delay is in effect
                }, timeSurplus + (this.turnFirst ? this.getDelay()*1000 : 0))
                if (this.turnFirst) {
                    this.turnFirst = false
                }
            } else {
                // Set an interval to report remaining time
                this.reportTimer = window.setInterval(() => {
                    const timers = this.copyTimers()
                    const timeDelta = this.getTimeDelta()
                    timers.elapsed[this.activePlayer] += timeDelta
                    timers.remaining[this.activePlayer] -= timeDelta
                    if (this.isHourglass()) {
                        timers.remaining[Color.swap(this.activePlayer)] += timeDelta
                    } else if (this.plyNum && !this.getIncrement()) {
                        delete timers.remaining[Color.swap(this.activePlayer)]
                    }
                    if (this.reportFunction) {
                        this.reportFunction(timers)
                    }
                    // Check if interval is still valid
                    const curInt = timers.remaining[this.activePlayer] > 10000 || timers.remaining[this.activePlayer] < 0
                                ? 1000 : 100
                    if (curInt !== interval) {
                        this.updateReportTimer()
                    }
                }, interval)
            }
        } else {
            // Report elapsed time if there are no time controls
            const interval = 1000
            const timeSurplus = interval - (this.time.elapsed[this.activePlayer] + this.getTimeDelta())%interval
            // Always set an individual timeout when turn changes and if the current player doesn't have full
            // seconds elapsed (with a small tolerance for error)
            if (timeSurplus > ChessTimer.MarginOfError &&
                interval - timeSurplus > ChessTimer.MarginOfError
            ) {
                // Not a full second, set a timeout for the remaining fraction first
                this.reportTimer = window.setTimeout(() => {
                    const timers = this.copyTimers()
                    const timeDelta = this.getTimeDelta()
                    timers.elapsed[this.activePlayer] += timeDelta
                    if (this.plyNum) {
                        // Don't report opponent time unless it gets and increment at move end
                        // (it looks strange if the time changes when it's not their turn)
                        delete timers.elapsed[Color.swap(this.activePlayer)]
                        delete timers.remaining[Color.swap(this.activePlayer)]
                    }
                    if (this.reportFunction) {
                        this.reportFunction(timers)
                    }
                    this.updateReportTimer()
                }, timeSurplus)
                if (this.turnFirst) {
                    this.turnFirst = false
                }
            } else {
                // Set an interval to report remaining time
                this.reportTimer = window.setInterval(() => {
                    const timers = this.copyTimers()
                    const timeDelta = this.getTimeDelta()
                    timers.elapsed[this.activePlayer] += timeDelta
                    if (this.plyNum) {
                        delete timers.elapsed[Color.swap(this.activePlayer)]
                        delete timers.remaining[Color.swap(this.activePlayer)]
                    }
                    if (this.reportFunction) {
                        this.reportFunction(timers)
                    }
                }, interval)
            }
        }
    }

    toString () {
        const fields = [] as string[]
        const suffix = [] as string[]
        for (const field of this.fields) {
            let descriptor = ''
            // Turn count
            if (field.end !== null) {
                descriptor = (field.end - field.start + 1).toString()
            }
            if (field.limit) {
                // Check and account for hourglass time control
                const limit = field.hourglass ? `*${field.limit}` : field.limit.toString()
                // Time limit
                if (field.end !== null) {
                    // Print / between turn count and limit
                    descriptor += `/${limit}`
                } else if (
                    fields.length && field.end === null &&
                    !field.delay && !field.increment
                ) {
                    // Print a sudden death limit
                    descriptor += `SD/${limit}`
                }
                if (field.delay) {
                    descriptor += `d${field.delay}`
                }
                if (field.increment) {
                    descriptor += `+${field.increment}`
                }
                fields.push(descriptor)
            } else if (field.delay || field.increment) {
                // Withouta limit, we should add increment/delay at the end
                if (field.delay) {
                    descriptor += `d${field.delay}`
                }
                if (field.increment) {
                    descriptor += `+${field.increment}`
                }
                suffix.push(descriptor)
            }
        }
        return fields.concat(...suffix).join(':')
    }
}
/**
 * Timers for elapsed and remaining time for White and Black.
 */
class Timers implements TCTimeValues {
    elapsed = {
        [Color.WHITE]: 0,
        [Color.BLACK]: 0,
    }
    remaining = {
        [Color.WHITE]: 0,
        [Color.BLACK]: 0,
    }
    constructor (params?: Timers) {
        if (params) {
            this.elapsed[Color.WHITE] = params.elapsed[Color.WHITE]
            this.elapsed[Color.BLACK] = params.elapsed[Color.BLACK]
            this.remaining[Color.WHITE] = params.remaining[Color.WHITE]
            this.remaining[Color.BLACK] = params.remaining[Color.BLACK]
        }
    }
}

export default ChessTimer
export { Timers }
