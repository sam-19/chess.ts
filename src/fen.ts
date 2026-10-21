import Color from './color.js'
import Piece from './piece.js'
import { ChessFen } from './types/fen.js'
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
       16: 'Black doesn\'t have the right number of kings on the board.',
       17: 'Pawns cannot be on the first or last rank.',
       18: '4th field (en-passant square) does not match a pawn that has just advanced two squares.',
       19: '3rd field (castling availability) does not match the king and rook positions.',
       20: 'The player not in turn is in check.',
    }
    /**
     * Is the square at `row` (0 = rank 8) and `file` (0 = a-file) attacked by the given side?
     * @param squares - The piece placement as 8 rows of 8 characters, rank 8 first, `.` for an empty square.
     */
    private static isAttacked (squares: string[], row: number, file: number, byWhite: boolean): boolean {
        const at = (r: number, f: number) => (r >= 0 && r < 8 && f >= 0 && f < 8 ? squares[r][f] : null)
        const own = (symbol: string) => byWhite ? symbol.toUpperCase() : symbol
        // A white pawn attacks towards rank 8, i.e. from the row below the square
        const pawnRow = byWhite ? row + 1 : row - 1
        if (at(pawnRow, file - 1) === own('p') || at(pawnRow, file + 1) === own('p')) {
            return true
        }
        const knightJumps = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]
        if (knightJumps.some(([r, f]) => at(row + r, file + f) === own('n'))) {
            return true
        }
        const kingSteps = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
        if (kingSteps.some(([r, f]) => at(row + r, file + f) === own('k'))) {
            return true
        }
        // Sliding pieces: the first piece along each line
        for (const [r, f] of kingSteps) {
            const sliders = r && f ? [own('b'), own('q')] : [own('r'), own('q')]
            let [cr, cf] = [row + r, file + f]
            while (at(cr, cf) === '.') {
                cr += r
                cf += f
            }
            const piece = at(cr, cf)
            if (piece && sliders.includes(piece)) {
                return true
            }
        }
        return false
    }
    /**
     * Validate this FEN string.
     * @param fen - The FEN string to validate.
     * @param onlyPosition - Only validate the position, ignoring the game state (default is false).
     * @param rules - Ruleset to apply (default is traditional).
     * @return
     * ```
     * {
     *     isValid: boolean      // Whether the fen is valid or not
     *     errorCode: number     // Possible error code, 0 means no error
     *     errorMessage: string  // Possible error string
     * }
     * ```
     */
    static readonly Validate = (fen: string, onlyPosition=false, rules='traditional') => {
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
        const trimmed = fen.trim()
        // Since the default starting position is the most common one, first check for that
        if (!onlyPosition && trimmed === Fen.DEFAULT_STARTING_STATE ||
            onlyPosition && trimmed === Fen.DEFAULT_STARTING_POSITION
        ) {
            return { isValid: true, errorCode: 0, errorMessage: Fen.ERRORS[0] }
        }
        // Must have 6 space-separated tokens
        const tokens = trimmed.split(/\s+/)
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
                if (/^[1-8]$/.test(rows[i][k])) {
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
            else if (/[pP]/.test(rows[0]) || /[pP]/.test(rows[7]))
                return { isValid: false, errorCode: 17, errorMessage: Fen.ERRORS[17] }
        }
        if (onlyPosition) {
            // Board position is valid
            return { isValid: true, errorCode: 0, errorMessage: Fen.ERRORS[0] }
        }
        // Move number must be 1 or higher
        if (!/^\d+$/.test(tokens[5]) || (parseInt(tokens[5], 10) <= 0)) {
            return { isValid: false, errorCode: 6, errorMessage: Fen.ERRORS[6] }
        }
        // Half move counter must be 0 or higher number
        if (!/^\d+$/.test(tokens[4])) {
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
        // The pawn that just advanced two squares must be in front of the en passant square, with the en passant
        // square and the square the pawn started from empty
        if (tokens[3] !== '-') {
            const squares = rows.map(row => row.replace(/[1-8]/g, n => '.'.repeat(parseInt(n))))
            const file = tokens[3].charCodeAt(0) - 'a'.charCodeAt(0)
            // Rows are listed from rank 8 to rank 1
            const [pawnRow, epRow, startRow, pawn] = tokens[1] === 'w' ? [3, 2, 1, 'p'] : [4, 5, 6, 'P']
            if (squares[pawnRow][file] !== pawn || squares[epRow][file] !== '.' || squares[startRow][file] !== '.') {
                return { isValid: false, errorCode: 18, errorMessage: Fen.ERRORS[18] }
            }
        }
        // Validate castling rights token
        // Castling rights are normally given in the order KQkq, but any order is accepted
        if (tokens[2] !== '-' && (!/^[KQkq]{1,4}$/.test(tokens[2]) || new Set(tokens[2]).size !== tokens[2].length)) {
            return { isValid: false, errorCode: 9, errorMessage: Fen.ERRORS[9] }
        }
        if (rules === 'traditional') {
            const squares = rows.map(row => row.replace(/[1-8]/g, n => '.'.repeat(parseInt(n))))
            // Each castling right needs its king and rook on their original squares (rows are listed from rank 8)
            const homes = { K: [7, 'K', 7, 'R'], Q: [7, 'K', 0, 'R'], k: [0, 'k', 7, 'r'], q: [0, 'k', 0, 'r'] } as const
            for (const right of tokens[2].replace('-', '')) {
                const [row, king, rookFile, rook] = homes[right as keyof typeof homes]
                if (squares[row][4] !== king || squares[row][rookFile] !== rook) {
                    return { isValid: false, errorCode: 19, errorMessage: Fen.ERRORS[19] }
                }
            }
            // The player who just moved cannot have left their king in check
            const opponentKing = tokens[1] === 'w' ? 'k' : 'K'
            const kingRow = squares.findIndex(row => row.includes(opponentKing))
            if (Fen.isAttacked(squares, kingRow, squares[kingRow].indexOf(opponentKing), tokens[1] === 'w')) {
                return { isValid: false, errorCode: 20, errorMessage: Fen.ERRORS[20] }
            }
        }
        // this.fen is valid
        return { isValid: true, errorCode: 0, errorMessage: Fen.ERRORS[0] }
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
        return Fen.Validate(this.fen, onlyPosition, rules)
    }
    /**
     * Return the FEN string.
     */
    toString () {
        return this.fen
    }
}