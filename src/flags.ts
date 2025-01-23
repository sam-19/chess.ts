// This class name is an exception to the rule of otherwise singular class names, because one Flags is in fact
// a collection of all the flags of a particular context.
import { Log } from 'scoped-event-log'
import { MoveFlags } from './types/flags'

const SCOPE = 'flags'

/**
 * A collection of flags that describe a given move.
 */
export default class Flags implements MoveFlags {
    // Static properties.
    // I'm leaving these to binary values in case I have to change the checks back to bit-wise comparisons later.
    /** Normal move. */
    static readonly NORMAL = 1
    /** A piece was captured. */
    static readonly CAPTURE = 2
    /** A double-advance initial pawn move. */
    static readonly DOUBLE_ADV = 4
    /** En-passant capture. */
    static readonly EN_PASSANT = 8
    /** A pawn was promoted. */
    static readonly PROMOTION = 16
    /** The move put the opponent in check. */
    static readonly CHECK = 32
    /** The move put the opponent in checkmate. */
    static readonly CHECKMATE = 64
    /** King castled to king-side. */
    static readonly CASTLE_KSIDE = 128
    /** King castled to queen-side. */
    static readonly CASTLE_QSIDE = 256
    // The following flags describe why some move cannot be made.
    /** The move would leave the player's king in check. */
    static readonly ILLEGAL_CHECK = 512
    /** The move would expose the player's king to attack. */
    static readonly ILLEGAL_PINNED = 1024
    /** The move is blocked by another piece. */
    static readonly ILLEGAL_BLOCKED = 2048
    /** The move is illegal for some other reason. */
    static readonly ILLEGAL_OTHER = 4096
    /** Single-character display codes for each flag. */
    static readonly DISPLAY = {
        [ Flags.NORMAL          ]: 'n',
        [ Flags.CAPTURE         ]: 'c',
        [ Flags.DOUBLE_ADV      ]: 'd', // Was originally b, is it some official standard?
        [ Flags.EN_PASSANT      ]: 'e',
        [ Flags.PROMOTION       ]: 'p',
        [ Flags.CASTLE_KSIDE    ]: 'k',
        [ Flags.CASTLE_QSIDE    ]: 'q',
        [ Flags.ILLEGAL_CHECK   ]: 'C',
        [ Flags.ILLEGAL_PINNED  ]: 'X',
        [ Flags.ILLEGAL_BLOCKED ]: 'B'
    }
    /** Array of valid move flags. */
    static readonly VALID = [
        Flags.NORMAL,
        Flags.CAPTURE,
        Flags.DOUBLE_ADV,
        Flags.EN_PASSANT,
        Flags.PROMOTION,
        Flags.CHECK,
        Flags.CHECKMATE,
        Flags.CASTLE_KSIDE,
        Flags.CASTLE_QSIDE,
        Flags.ILLEGAL_CHECK,
        Flags.ILLEGAL_PINNED,
        Flags.ILLEGAL_BLOCKED,
        Flags.ILLEGAL_OTHER,
    ]

    // Instance porperties

    flags: number[] = []
    /**
     * Create a new flags object with the fiven flags
     * @param flags
     */
    constructor (flags: number[] = []) {
        for (const flag of flags) {
            this.add(flag)
        }
    }

    get length () {
        return this.flags.length
    }

    add (flag: number) {
        if (this.contains(flag)) {
            Log.warn(`Could not add flag: Flag collection already contained ${Flags.DISPLAY[flag as keyof typeof Flags.DISPLAY]}.`, SCOPE)
        } else if (Flags.VALID.indexOf(flag) === -1) {
            Log.error(`Could not add flag: The flag code ${flag} did not match any valid flags!`, SCOPE)
        } else {
            this.flags.push(flag)
        }
    }

    clear () {
        this.flags = []
    }

    contains (flag: number) {
        for (let i=0; i<this.flags.length; i++) {
            if (this.flags[i] === flag) {
                return true
            }
        }
        return false
    }

    copy () {
        return new Flags(this.flags)
    }

    remove (flag: number, silent = false) {
        for (let i=0; i<this.flags.length; i++) {
            if (this.flags[i] === flag) {
                this.flags.splice(i, 1)
                return
            }
        }
        if (!silent) {
            Log.warn(`Could not remove flag: Flag collection did not contain ${Flags.DISPLAY[flag as keyof typeof Flags.DISPLAY]}.`, SCOPE)
        }
    }

    replace (old: number, flag: number, silent = false) {
        for (let i=0; i<this.flags.length; i++) {
            if (this.flags[i] === old) {
                this.flags.splice(i, 1)
                this.add(flag)
                return
            }
        }
        if (!silent) {
            Log.warn(`Could not remove flag: Flag collection did not contain ${Flags.DISPLAY[flag as keyof typeof Flags.DISPLAY]}.`, SCOPE)
        }
        // Add the new flag anyway
        this.add(flag)
    }
}
