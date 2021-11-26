// This class name is an exception to the rule of otherwise singular class names, because one Flags is in fact
// a collection of all the flags of a particular context.
import { MoveFlags } from '../types/flags'
/**
 * A collection of flags that describe a given move.
 */
class Flags implements MoveFlags {
    // Static properties
    // I'm leaving these to binary values in case I have to change the checks back to bit-wise comparisons later
    static readonly NORMAL = 1
    static readonly CAPTURE = 2
    static readonly DOUBLE_ADV = 4  // Pawn doing a double advance
    static readonly EN_PASSANT = 8
    static readonly PROMOTION = 16
    static readonly CHECK = 32
    static readonly CHECKMATE = 64
    static readonly KSIDE_CASTLING = 128
    static readonly QSIDE_CASTLING = 256
    static readonly IN_CHECK = 512 // The player in turn is in check
    static readonly PINNED = 1024 // The proposed move would expose the king to attack
    static readonly MOVE_BLOCKED = 2048 // This move is blocked by another piece
    static readonly DISPLAY = {
        [ Flags.NORMAL         ]: 'n',
        [ Flags.CAPTURE        ]: 'c',
        [ Flags.DOUBLE_ADV     ]: 'd', // Was originally b, is it some official standard?
        [ Flags.EN_PASSANT     ]: 'e',
        [ Flags.PROMOTION      ]: 'p',
        [ Flags.KSIDE_CASTLING ]: 'k',
        [ Flags.QSIDE_CASTLING ]: 'q',
        [ Flags.IN_CHECK       ]: 'C',
        [ Flags.PINNED         ]: 'X',
        [ Flags.MOVE_BLOCKED   ]: 'B'
    }
    static readonly VALID = [
        Flags.NORMAL,
        Flags.CAPTURE,
        Flags.DOUBLE_ADV,
        Flags.EN_PASSANT,
        Flags.PROMOTION,
        Flags.CHECK,
        Flags.CHECKMATE,
        Flags.KSIDE_CASTLING,
        Flags.QSIDE_CASTLING,
        Flags.IN_CHECK,
        Flags.PINNED,
        Flags.MOVE_BLOCKED,
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
    /**
     * Get the number of flags in this collection.
     * @returns number of flags
     */
    get length () {
        return this.flags.length
    }
    /**
     * Add the given flag to this collection
     * @param flag
     */
    add (flag: number) {
        if (this.contains(flag)) {
            console.warn(`Could not add flag: Flag collection already contained ${Flags.DISPLAY[flag as keyof typeof Flags.DISPLAY]}`)
        } else if (Flags.VALID.indexOf(flag) === -1) {
            console.error(`Could not add flag: The flag code ${flag} did not match any valid flags!`)
        } else {
            this.flags.push(flag)
        }
    }
    /**
     * Clear all flags from this collection
     */
    clear () {
        this.flags = []
    }
    /**
     * Check if this collection contains the given flag
     * @param flag
     */
    contains (flag: number) {
        for (let i=0; i<this.flags.length; i++) {
            if (this.flags[i] === flag) {
                return true
            }
        }
        return false
    }
    /**
     * Copy this collection and return a new, identical object
     */
    copy () {
        return new Flags(this.flags)
    }
    /**
     * Remove the given flag from this collection
     * @param flag
     * @param silent do not give a warning if the flag was not found (default false)
     */
    remove (flag: number, silent: boolean = false) {
        for (let i=0; i<this.flags.length; i++) {
            if (this.flags[i] === flag) {
                this.flags.splice(i, 1)
                return
            }
        }
        if (!silent) {
            console.warn(`Could not remove flag: Flag collection did not contain ${Flags.DISPLAY[flag as keyof typeof Flags.DISPLAY]}`)
        }
    }
    /**
     * Replace the old flag with the given new flag
     * @param old
     * @param flag
     * @param silent do not give a warning, if the old flag was not found
     */
    replace (old: number, flag: number, silent: boolean = false) {
        for (let i=0; i<this.flags.length; i++) {
            if (this.flags[i] === old) {
                this.flags.splice(i, 1)
                this.add(flag)
                return
            }
        }
        if (!silent) {
            console.warn(`Could not remove flag: Flag collection did not contain ${Flags.DISPLAY[flag as keyof typeof Flags.DISPLAY]}`)
        }
        // Add the new flag anyway
        this.add(flag)
    }
}

export default Flags
