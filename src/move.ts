import Board from './board'
import Color from './color'
import Flags from './flags'
import { Log } from 'scoped-event-log'
import Options from './options'
import Piece from './piece'

import { ChessMove } from './types/move'
import { ChessPiece } from './types/piece'
import { MoveFlags } from './types/flags'
import { MethodOptions } from './types/options'
import { BoardSquareIndex } from './types/board'

const SCOPE = 'move'

export default class Move implements ChessMove {
    // Static properties
    // From original Chess.js
    static readonly ATTACKS = [
        20, 0, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0, 0,20, 0,
        0, 20, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0,20, 0, 0,
        0,  0,20, 0, 0, 0, 0,24, 0, 0, 0, 0,20, 0, 0, 0,
        0,  0, 0,20, 0, 0, 0,24, 0, 0, 0,20, 0, 0, 0, 0,
        0,  0, 0, 0,20, 0, 0,24, 0, 0,20, 0, 0, 0, 0, 0,
        0,  0, 0, 0, 0,20, 2,24, 2,20, 0, 0, 0, 0, 0, 0,
        0,  0, 0, 0, 0, 2,53,56,53, 2, 0, 0, 0, 0, 0, 0,
        24,24,24,24,24,24,56, 0,56,24,24,24,24,24,24, 0,
        0,  0, 0, 0, 0, 2,53,56,53, 2, 0, 0, 0, 0, 0, 0,
        0,  0, 0, 0, 0,20, 2,24, 2,20, 0, 0, 0, 0, 0, 0,
        0,  0, 0, 0,20, 0, 0,24, 0, 0,20, 0, 0, 0, 0, 0,
        0,  0, 0,20, 0, 0, 0,24, 0, 0, 0,20, 0, 0, 0, 0,
        0,  0,20, 0, 0, 0, 0,24, 0, 0, 0, 0,20, 0, 0, 0,
        0, 20, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0,20, 0, 0,
        20 ,0, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0, 0,20, 0
    ]
    static readonly PAWN_OFFSETS = {
        [Color.WHITE]: [-16, -32, -17, -15],
        [Color.BLACK]: [ 16,  32,  17,  15]
    }
    static readonly PIECE_OFFSETS = {
        [Piece.TYPE_KNIGHT]: [-18, -33, -31, -14,  18, 33, 31, 14],
        [Piece.TYPE_BISHOP]: [-17, -15,  17,  15],
        [Piece.TYPE_ROOK]:   [-16,   1,  16,  -1],
        [Piece.TYPE_QUEEN]:  [-17, -16, -15,   1,  17, 16, 15, -1],
        [Piece.TYPE_KING]:   [-17, -16, -15,   1,  17, 16, 15, -1]
    }
    static readonly RAYS = [
        17, 0,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0,  0, 15, 0,
        0, 17,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0, 15,  0, 0,
        0,  0, 17,  0,  0,  0,  0, 16,  0,  0,  0,  0, 15,  0,  0, 0,
        0,  0,  0, 17,  0,  0,  0, 16,  0,  0,  0, 15,  0,  0,  0, 0,
        0,  0,  0,  0, 17,  0,  0, 16,  0,  0, 15,  0,  0,  0,  0, 0,
        0,  0,  0,  0,  0, 17,  0, 16,  0, 15,  0,  0,  0,  0,  0, 0,
        0,  0,  0,  0,  0,  0, 17, 16, 15,  0,  0,  0,  0,  0,  0, 0,
        1,  1,  1,  1,  1,  1,  1,  0, -1, -1,  -1,-1, -1, -1, -1, 0,
        0,  0,  0,  0,  0,  0,-15,-16,-17,  0,  0,  0,  0,  0,  0, 0,
        0,  0,  0,  0,  0,-15,  0,-16,  0,-17,  0,  0,  0,  0,  0, 0,
        0,  0,  0,  0,-15,  0,  0,-16,  0,  0,-17,  0,  0,  0,  0, 0,
        0,  0,  0,-15,  0,  0,  0,-16,  0,  0,  0,-17,  0,  0,  0, 0,
        0,  0,-15,  0,  0,  0,  0,-16,  0,  0,  0,  0,-17,  0,  0, 0,
        0,-15,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,-17,  0, 0,
        -15,0,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,  0,-17, 0
    ]
    static readonly SHIFTS = {
        [Piece.TYPE_PAWN]:   0,
        [Piece.TYPE_KNIGHT]: 1,
        [Piece.TYPE_BISHOP]: 2,
        [Piece.TYPE_ROOK]:   3,
        [Piece.TYPE_QUEEN]:  4,
        [Piece.TYPE_KING]:   5
    }
    static readonly DOWN = 16
    static readonly LEFT = -1
    static readonly RIGHT = 1
    static readonly UP = -16

    // Wildcard (or null) move symbols
    static readonly WILDCARD_MOVES = ['--', '<>']
    static readonly NULL_MOVES = Move.WILDCARD_MOVES

    // Instance properties
    algebraic: string | null = null
    capturedPiece: ChessPiece | null = null
    dest: BoardSquareIndex | -1
    detail = new Map<string, string | string[] | number | number[]>()
    fen: string | null = null
    flags: MoveFlags
    legal: boolean | null = null
    movedPiece: ChessPiece
    orig: BoardSquareIndex | -1
    promotionPiece: ChessPiece | null = null
    san: string | null = null
    uci: string | null = null
    wildcard = false
    // Possible error
    error?: string

    constructor (options: MethodOptions.MoveOptions) {
        const {                   // These must be passed
            orig,               // Int
            dest,               // Int
            movedPiece,         // Piece
            capturedPiece,      // Piece / null
            promotionPiece,     // Piece / null
            flags,               // Int[]
            detail,
        } = options
        this.flags = new Flags(flags)
        this.movedPiece = movedPiece
        // Check that origin and destination squares are valid
        if (!Board.isValidSquareIndex(orig) || !Board.isValidSquareIndex(dest)) {
            Log.error("Invalid origin and/or destination square give to move generator: " + orig + ", " + dest + ".", SCOPE)
            this.orig = -1
            this.dest = -1
        } else {
            this.orig = orig
            this.dest = dest
        }
        if (!flags.length) {
            this.flags.add(Flags.NORMAL)
        }
        for (const [key, value] of Object.entries(detail || {})) {
            this.detail.set(key, value)
        }
        if (promotionPiece) {
            this.flags.add(Flags.PROMOTION)
        }
        // Check for en passant capture
        if (!capturedPiece && this.flags.contains(Flags.EN_PASSANT)) {
            this.capturedPiece = (movedPiece.color === Color.WHITE ? Piece.BLACK_PAWN : Piece.WHITE_PAWN)
        } else {
            this.capturedPiece = capturedPiece
        }
        // TODO: Hande interactive promotion
        if (!promotionPiece) {
            this.promotionPiece = (movedPiece.color === Color.WHITE ? Piece.WHITE_QUEEN : Piece.BLACK_QUEEN)
        } else {
            this.promotionPiece = promotionPiece
        }
        // Generate algebraic and UCI notation for move
        this.algebraic = Board.SQUARE_NAMES[this.orig as keyof typeof Board.SQUARE_NAMES]
                         + "-"
                         + Board.SQUARE_NAMES[this.dest as keyof typeof Board.SQUARE_NAMES]
        this.uci = Board.SQUARE_NAMES[this.orig as keyof typeof Board.SQUARE_NAMES]
                   + Board.SQUARE_NAMES[this.dest as keyof typeof Board.SQUARE_NAMES]
    }
    // Copy from another Move object
    static copyFrom (move: ChessMove): Move {
        const copy = Object.create(Move.prototype)
        copy.orig = move.orig
        copy.dest = move.dest
        copy.detail = move.detail
        copy.movedPiece = move.movedPiece
        copy.capturedPiece = move.capturedPiece
        copy.flags = move.flags
        copy.san = move.san
        copy.promotionPiece = move.promotionPiece
        copy.wildcard = move.wildcard
        copy.algebraic = move.algebraic
        copy.uci = move.uci
        // SAN cannot be copied as it depends on the board state
        return copy
    }
    // Generate a move from given SAN
    static generateFromSan (san: string, board: Board) {
        if (san === undefined || san === null || san === "") {
            return { error: "Empty SAN provided to move generator." }
        }
        if (board === undefined || board === null) {
            return { error: "Empty Board provided to move generator." }
        }
        san = san.trim().replace(/[+#?!=]+$/,'') // Remove meta notation; TODO: store meta notation
        if (Move.WILDCARD_MOVES.indexOf(san) !== -1)
            return Move.generateWildcardMove(board)
        else {
            const legalMoves = board.generateMoves({ includeSan: true, onlyLegal: true })
            // Check that the given SAN represents a legal move
            // First check for exact move matches
            for (let i=0; i<legalMoves.length; i++) {
                if (legalMoves[i].san === san) {
                    return legalMoves[i]
                }
            }
            // Failing that, try ignoring inconsistencies with the end of the move string (meta symbols)
            for (let i=0; i<legalMoves.length; i++) {
                // Queen side castling moves need special handling (they share the same beginning with king
                // side castling moves and can be checking or mating moves)
                if ((!legalMoves[i].san?.startsWith('O-O-O') && legalMoves[i].san?.startsWith(san)) ||
                    (!san.startsWith('O-O-O') && san.startsWith(legalMoves[i].san as string)) ||
                    (san.startsWith('O-O-O') && legalMoves[i].san?.startsWith('O-O-O'))
                ) {
                    return legalMoves[i]
                }
            }
            // If cleanly matching the move failed, optionally allow for sloppy matching
            if (Options.Move.sloppySAN) {
                // Makes a sloppier comparison of the two SAN strings (i.e. allows for over-disambiguation)
                // Matches piece (match[1]), orig (match[2]), dest (match[3]) and promotion piece (match[4])
                // TODO: Write tests for this, good starting point:
                // https://github.com/jhlywa/chess.js/commit/309a0fd4e309e4d06cb3d2956c35710002c66711
                const sloppySAN = san.match(/([pnbrqkPNBRQK])?([a-h])?([1-8])?x?-?([a-h][1-8])([qrbnQRBN])?[+#]?/)
                const oSqr = []
                if (sloppySAN === null) {
                    return { error: `SAN ${san} provided to move generator does not represent a legal move!` }
                }
                if (sloppySAN[3] === undefined) {
                    for (let i=1; i<9; i++) {
                        oSqr.push(Board.SQUARE_INDICES[(sloppySAN[2]+i as keyof typeof Board.SQUARE_INDICES)])
                    }
                } else {
                    oSqr.push(Board.SQUARE_INDICES[(sloppySAN[2]+sloppySAN[3] as keyof typeof Board.SQUARE_INDICES)])
                }
                for (let i=0; i<legalMoves.length; i++) {
                    if (sloppySAN && (sloppySAN[1] === undefined || sloppySAN[1].toLowerCase() === legalMoves[i].movedPiece?.type)
                        && (oSqr.indexOf(legalMoves[i].orig as number) !== -1)
                        && Board.SQUARE_INDICES[sloppySAN[4] as keyof typeof Board.SQUARE_INDICES] === legalMoves[i].dest
                        && (sloppySAN[5] === undefined || sloppySAN[5].toLowerCase() === legalMoves[i].promotionPiece?.type))
                    {
                        return legalMoves[i]
                    }
                }
            }
            return { error: `SAN ${san} provided to move generator does not represent a legal move. Legal moves in this position are [ ${legalMoves.map(move => move.san).join(', ')} ]` }
        }
    }
    // Generate a move from algebraic notation
    static generateFromAlgebraic (orig: string, dest: string, board: Board, promotionPiece?: ChessPiece) {
        // Check for missing arguments
        if (orig === undefined || orig === null || orig === "")
            return { error: "Request to move generator doesn't include an origin square." }
        if (dest === undefined || dest === null || dest === "")
            return { error: "Request to move generator doesn't include a destination square." }
        if (board === undefined || board === null)
            return { error: "Request to move generator doesn't include a valid Board." }
        // Check for promotion piece if move is a promotion move
        if (dest.length === 3 && promotionPiece === undefined) {
            const promo = dest.substring(2)
            dest = dest.substring(0,2)
            if (board.turn === Color.WHITE) {
                promotionPiece = Piece.forSymbol(promo.toUpperCase())
            } else {
                promotionPiece = Piece.forSymbol(promo)
            }
        }
        const origInd = Board.SQUARE_INDICES[orig as keyof typeof Board.SQUARE_INDICES]
        const destInd = Board.SQUARE_INDICES[dest as keyof typeof Board.SQUARE_INDICES]
        // Check legal moves and include SAN (PGN generation from turn history requires SAN)
        const moves = board.generateMoves({ includeSan: true, onlyLegal: false })
        for (let i=0; i<moves.length; i++) {
            // Check that requested move is legal
            if (moves[i].orig === origInd && moves[i].dest === destInd) {
                if (!moves[i].legal)
                    return { error: "Algebraic notation provided to move generator does not represent a legal move.", flags: moves[i].flags }
                if (moves[i].flags?.contains(Flags.PROMOTION)) {
                    if (promotionPiece===undefined) {
                        promotionPiece = board.turn === Color.WHITE ? Piece.WHITE_QUEEN : Piece.BLACK_QUEEN
                    }
                    if (moves[i].promotionPiece !== promotionPiece) {
                        continue
                    }
                }
                return moves[i]
            }
        }
        return { error: "Algebraic notation provided to move generator does not represent a valid move." }
    }
    // Generate a random/wildcard move
    static generateWildcardMove(board: Board) {
        const legalMoves = board.generateMoves()
        if (!legalMoves.length)
            return { error: "Could not generate wildcard move: No legal moves exist." }
        else {
            const move = legalMoves[0]
            // Set wildcand flag
            move.wildcard = true
            return move
        }
    }
    // Generate SAN for given move
    static toSan (move: Move, board: Board) {
        if (move.wildcard) {
            return Move.WILDCARD_MOVES[0]
        }
        let san = ""
        // Castling moves
        if (move.flags?.contains(Flags.KSIDE_CASTLING)) {
            san = "O-O"
        } else if (move.flags?.contains(Flags.QSIDE_CASTLING)) {
            san = "O-O-O"
        } else {
            // Make sure the resulting SAN can represent only one legal move
            if (move.movedPiece?.type !== Piece.TYPE_PAWN) {
                san += move.movedPiece?.type.toUpperCase()
            }
            san += board.disambiguateMove(move)
            if (move.flags?.contains(Flags.CAPTURE) ||  move.flags?.contains(Flags.EN_PASSANT)) {
                san += "x"  // Capture move
            }
            san += Move.toAlgebraic(move.dest as number)
            // Check for promotion
            if (move.flags?.contains(Flags.PROMOTION)) {
                san += "=" + move.promotionPiece?.type.toUpperCase()
            }
        }
        if (move.flags?.contains(Flags.CHECKMATE)) {
            san += "#"
        } else if (move.flags?.contains(Flags.CHECK)) {
            san += "+"
        }
        return san
    }
    // Return algebraic code for a 0x88 board index
    static toAlgebraic (i: number) {
        return Board.SQUARE_NAMES[i as keyof typeof Board.SQUARE_NAMES]
    }
}
/* ===============================================================
   0x88 chessboard cheat sheet from aaronfi's original source code
   ===============================================================
   https://chessprogramming.wikispaces.com/0x88
   Note:  The values we use are flipped from the documented convention.

      | a   b   c   d   e   f   g   h
    ------------------------------------
    8 | 0   1   2   3   4   5   6   7
    7 | 16  17  18  19  20  21  22  23
    6 | 32  33  34  35  36  37  38  39
    5 | 48  49  50  51  52  53  54  55
    4 | 64  65  66  67  68  69  70  71
    3 | 80  81  82  83  84  85  86  87
    2 | 96  97  98  99  100 101 102 103
    1 | 112 113 114 115 116 117 118 119
*/
