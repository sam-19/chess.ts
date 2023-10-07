import Color from './color'
import Piece from './piece'
import { ChessFen } from './types/fen'
/**
 * A Forsynth-Edwards Notation string describing a chess game state.
 */
export default class Fen implements ChessFen {
    // Static properties
    static readonly DEFAULT_STARTING_STATE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    static readonly DEFAULT_STARTING_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'
    static readonly EMPTY_BOARD = '8/8/8/8/8/8/8/8'
    static readonly ERRORS =  {
        0: 'No errors.',
        1: ['FEN string must contain six space-delimited fields.', 'Board position must be one continuous string'],
        2: '1st field (piece positions) does not contain 8 slash-delimited rows.',
        3: '1st field (piece positions) is invalid: consecutive numbers.',
        4: '1st field (piece positions) is invalid: invalid piece.',
        5: '1st field (piece positions) is invalid: wrong number of squares in a row.',
        6: '6th field (move number) must be a positive integer.',
        7: '5th field (half move counter) must be a non-negative integer.',
        8: '4th field (en-passant square) is invalid.',
        9: '3rd field (castling availability) is invalid.',
       10: '2nd field (player to move) is invalid.',
       11: 'White has more than 16 pieces on the board.',
       12: 'Black has more than 16 pieces on the board.',
       13: 'White has more than 8 pawns on the board.',
       14: 'Black has more than 8 pawns on the board.',
       15: 'White doesn\'t have the right number of kings on the board.',
       16: 'Black doesn\'t have the right number of kings on the board.'
    }
    // Instance properties
    fen: string

    constructor (fen: string = Fen.DEFAULT_STARTING_STATE) {
        this.fen = fen
    }

    // Methods

    /**
     * Invert (or flip) the board position, changing the sides of white and black.
     */
    invert (): string {
        // Process only the position part
        const pos = this.fen.indexOf(' ') !== -1 ? this.fen.split(' ')[0] : this.fen
        const items = pos.split('')
        items.reverse()
        const invPos = items.join('')
        return this.fen.replace(pos, invPos)
    }
    /**
     * Validate this FEN string.
     * @param onlyPosition only validate the position, ignoring the game state (default is false)
     * @param rules ruleset to apply (default is traditional)
     * @return
     * ```
     * {
     *     isValid: boolean      // Whether the fen is valid or not
     *     errorCode: number     // Possible error code, 0 means no error
     *     errorMessage: string  // Possible error string
     * }
     * ```
     */
    validate (onlyPosition=false, rules='traditional') {
        // Set up some variables for error checking
        const pieces = {
            [Color.WHITE]: 0,
            [Color.BLACK]: 0
        }
        const kings = {
            [Color.WHITE]: 0,
            [Color.BLACK]: 0
        }
        const pawns = {
            [Color.WHITE]: 0,
            [Color.BLACK]: 0
        }
        // Since the default starting position is the most common one, first check for that
        if (!onlyPosition && this.fen.trim() === Fen.DEFAULT_STARTING_STATE ||
            onlyPosition && this.fen.trim() === Fen.DEFAULT_STARTING_POSITION
        ) {
            return { isValid: true, errorCode: 0, errorMessage: Fen.ERRORS[0] }
        }
        // Must have 6 space-separated tokens
        const tokens = this.fen.trim().split(/\s+/)
        if (!onlyPosition && tokens.length !== 6) {
            return { isValid: false, errorCode: 1, errorMessage: Fen.ERRORS[1][0] }
        } else if (onlyPosition && tokens.length !== 1) {
            return { isValid: false, errorCode: 1, errorMessage: Fen.ERRORS[1][1] }
        }
        // First token must have 8 slash-separated row elements
        const rows = tokens[0].split('/')
        if (rows.length !== 8) {
            return { isValid: false, errorCode: 2, errorMessage: Fen.ERRORS[2] }
        }
        // All rows must validate to board positions
        for (let i=0; i<rows.length; i++) {
            // Right number of fields and:
            // - exactly one king per side
            // - no more than 8 pawns per side
            // - no more than 16 pieces per side
            // on either side
            let sumSquares = 0
            let previousWasNumber = false
            for (let k=0; k<rows[i].length; k++) {
                if (!isNaN(parseInt(rows[i][k], 10))) {
                    if (previousWasNumber) {
                        return { isValid: false, errorCode: 3, errorMessage: Fen.ERRORS[3] }
                    }
                    sumSquares += parseInt(rows[i][k], 10)
                    previousWasNumber = true
                } else {
                    if (/^[PRNBQK]$/.test(rows[i][k]))
                        pieces[Color.WHITE] += 1
                    else if (/^[prnbqk]$/.test(rows[i][k]))
                        pieces[Color.BLACK] += 1
                    else
                        return { isValid: false, errorCode: 4, errorMessage: Fen.ERRORS[4] }
                    if (rows[i][k] === Piece.WHITE_KING.symbol)
                        kings[Color.WHITE] += 1
                    else if (rows[i][k] === Piece.BLACK_KING.symbol)
                        kings[Color.BLACK] += 1
                    else if (rows[i][k] === Piece.WHITE_PAWN.symbol)
                        pawns[Color.WHITE] += 1
                    else if (rows[i][k] === Piece.BLACK_PAWN.symbol)
                        pawns[Color.BLACK] += 1
                    sumSquares++
                    previousWasNumber = false
                }
            }
            if (sumSquares !== 8)
                return { isValid: false, errorCode: 5, errorMessage: Fen.ERRORS[5] }
        }
        if (rules === 'traditional') {
            if (pieces[Color.WHITE] > 16)
                return { isValid: false, errorCode: 11, errorMessage: Fen.ERRORS[11] }
            else if (pieces[Color.BLACK] > 16)
                return { isValid: false, errorCode: 12, errorMessage: Fen.ERRORS[12] }
            else if (pawns[Color.WHITE] > 8)
                return { isValid: false, errorCode: 13, errorMessage: Fen.ERRORS[13] }
            else if (pawns[Color.BLACK] > 8)
                return { isValid: false, errorCode: 14, errorMessage: Fen.ERRORS[14] }
            else if (kings[Color.WHITE] !== 1)
                return { isValid: false, errorCode: 15, errorMessage: Fen.ERRORS[15] }
            else if (kings[Color.BLACK] !== 1)
                return { isValid: false, errorCode: 16, errorMessage: Fen.ERRORS[16] }
        }
        if (onlyPosition) {
            // Board position is valid
            return { isValid: true, errorCode: 0, errorMessage: Fen.ERRORS[0] }
        }
        // Move number must be 1 or higher
        if (isNaN(parseInt(tokens[5])) || (parseInt(tokens[5], 10) <= 0)) {
            return { isValid: false, errorCode: 6, errorMessage: Fen.ERRORS[6] }
        }
        // Half move counter must be 0 or higher number
        if (isNaN(parseInt(tokens[4])) || (parseInt(tokens[4], 10) < 0)) {
            return { isValid: false, errorCode: 7, errorMessage: Fen.ERRORS[7] }
        }
        // Player to move must be either w (white) or b (black)
        if (!/^(w|b)$/.test(tokens[1])) {
            return { isValid: false, errorCode: 10, errorMessage: Fen.ERRORS[10] }
        }
        // Validate en passant token (had to move this down here to have turn checked first)
        if (tokens[1] === 'w' && !/^(-|[abcdefgh]6)$/.test(tokens[3])
            || tokens[1] === 'b' && !/^(-|[abcdefgh]3)$/.test(tokens[3]))
        {
            return { isValid: false, errorCode: 8, errorMessage: Fen.ERRORS[8] }
        }
        // Validate castling rights token
        if( !/^(KQ?k?q?|Qk?q?|kq?|q|-)$/.test(tokens[2])) {
            return { isValid: false, errorCode: 9, errorMessage: Fen.ERRORS[9] }
        }
        // this.fen is valid
        return { isValid: true, errorCode: 0, errorMessage: Fen.ERRORS[0] }
    }
    /**
     * Return the FEN string.
     */
    toString () {
        return this.fen
    }
}