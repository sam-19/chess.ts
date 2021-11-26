import Board from './board'
import Color from './color'
import Flags from './flags'
import Log from './log'
import Options from './options'
import Piece from './piece'

import { ChessMove } from '../types/move'
import { ChessPiece } from '../types/piece'
import { MoveFlags } from '../types/flags'
import { MethodOptions } from '../types/options'

class Move implements ChessMove {
    // Static properties
    // From original Chess.js
    static readonly SQUARE_INDICES = {
        a8:   0, b8:   1, c8:   2, d8:   3, e8:   4, f8:   5, g8:   6, h8:   7,
        a7:  16, b7:  17, c7:  18, d7:  19, e7:  20, f7:  21, g7:  22, h7:  23,
        a6:  32, b6:  33, c6:  34, d6:  35, e6:  36, f6:  37, g6:  38, h6:  39,
        a5:  48, b5:  49, c5:  50, d5:  51, e5:  52, f5:  53, g5:  54, h5:  55,
        a4:  64, b4:  65, c4:  66, d4:  67, e4:  68, f4:  69, g4:  70, h4:  71,
        a3:  80, b3:  81, c3:  82, d3:  83, e3:  84, f3:  85, g3:  86, h3:  87,
        a2:  96, b2:  97, c2:  98, d2:  99, e2: 100, f2: 101, g2: 102, h2: 103,
        a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
    }
    static readonly SQUARE_NAMES = {
        0:  'a8',   1: 'b8',   2: 'c8',   3: 'd8',   4: 'e8',   5: 'f8',   6: 'g8',   7: 'h8',
    16:  'a7',  17: 'b7',  18: 'c7',  19: 'd7',  20: 'e7',  21: 'f7',  22: 'g7',  23: 'h7',
    32:  'a6',  33: 'b6',  34: 'c6',  35: 'd6',  36: 'e6',  37: 'f6',  38: 'g6',  39: 'h6',
    48:  'a5',  49: 'b5',  50: 'c5',  51: 'd5',  52: 'e5',  53: 'f5',  54: 'g5',  55: 'h5',
    64:  'a4',  65: 'b4',  66: 'c4',  67: 'd4',  68: 'e4',  69: 'f4',  70: 'g4',  71: 'h4',
    80:  'a3',  81: 'b3',  82: 'c3',  83: 'd3',  84: 'e3',  85: 'f3',  86: 'g3',  87: 'h3',
    96:  'a2',  97: 'b2',  98: 'c2',  99: 'd2', 100: 'e2', 101: 'f2', 102: 'g2', 103: 'h2',
    112:  'a1', 113: 'b1', 114: 'c1', 115: 'd1', 116: 'e1', 117: 'f1', 118: 'g1', 119: 'h1'
    }
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

    // Wildcard (or null) move symbols
    static readonly WILDCARD_MOVES = ['--', '<>']
    static readonly NULL_MOVES = Move.WILDCARD_MOVES

    // Instance properties
    algebraic: string | null = null
    capturedPiece: ChessPiece | null = null
    dest: number | null = null
    fen: string | null = null
    flags: MoveFlags | null = null
    legal: boolean | null = null
    movedPiece: ChessPiece | null = null
    orig: number | null = null
    promotionPiece: ChessPiece | null = null
    san: string | null = null
    uci: string | null = null
    wildcard: boolean = false
    // Possible error
    error?: string

    constructor (options: MethodOptions.MoveOptions) {
        let {                   // These must be passed
            orig,               // INT
            dest,               // INT
            movedPiece,         // Piece
            capturedPiece,      // Piece / null
            promotionPiece,     // Piece / null
            flags               // [INT]
        } = options
        // Check that origin and destination squares are valid
        if (!Move.isValidIndex(orig) || !Move.isValidIndex(dest)) {
            Log.error("Invalid origin and/or destination square give to move generator: " + orig + ", " + dest + ".")
            return
        }
        // Assing checked variables
        this.orig = orig
        this.dest = dest
        this.movedPiece = movedPiece
        this.capturedPiece = capturedPiece
        this.flags = new Flags(flags)
        if (!flags) {
            this.flags.add(Flags.NORMAL)
        }
        if (promotionPiece) {
            this.flags.add(Flags.PROMOTION)
        }
        // Check for en passant capture
        if (!capturedPiece && this.flags.contains(Flags.EN_PASSANT)) {
            capturedPiece = (movedPiece.color === Color.WHITE ? Piece.BLACK_PAWN : Piece.WHITE_PAWN)
        }
        // TODO: Hande interactive promotion
        if (promotionPiece === null)
            promotionPiece = (movedPiece.color === Color.WHITE ? Piece.WHITE_QUEEN : Piece.BLACK_QUEEN)
        this.promotionPiece = promotionPiece
        // Generate algebraic and UCI notation for move
        this.algebraic = Move.SQUARE_NAMES[this.orig as keyof typeof Move.SQUARE_NAMES]
                         + "-"
                         + Move.SQUARE_NAMES[this.dest as keyof typeof Move.SQUARE_NAMES]
        this.uci = Move.SQUARE_NAMES[this.orig as keyof typeof Move.SQUARE_NAMES]
                   + Move.SQUARE_NAMES[this.dest as keyof typeof Move.SQUARE_NAMES]
    }
    // Copy from another Move object
    static copyFrom (move: ChessMove) {
        let copy = Object.create(Move.prototype)
        copy.orig = move.orig
        copy.dest = move.dest
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
                let sloppySAN = san.match(/([pnbrqkPNBRQK])?([a-h])?([1-8])?x?-?([a-h][1-8])([qrbnQRBN])?[+#]?/)
                let oSqr = []
                if (sloppySAN === null) {
                    return { error: `SAN ${san} provided to move generator does not represent a legal move!` }
                }
                if (sloppySAN[3] === undefined) {
                    for (let i=1; i<9; i++) {
                        oSqr.push(Move.SQUARE_INDICES[(sloppySAN[2]+i as keyof typeof Move.SQUARE_INDICES)])
                    }
                } else {
                    oSqr.push(Move.SQUARE_INDICES[(sloppySAN[2]+sloppySAN[3] as keyof typeof Move.SQUARE_INDICES)])
                }
                for (let i=0; i<legalMoves.length; i++) {
                    if (sloppySAN && (sloppySAN[1] === undefined || sloppySAN[1].toLowerCase() === legalMoves[i].movedPiece?.type)
                        && (oSqr.indexOf(legalMoves[i].orig as number) !== -1)
                        && Move.SQUARE_INDICES[sloppySAN[4] as keyof typeof Move.SQUARE_INDICES] === legalMoves[i].dest
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
            let promo = dest.substring(2)
            dest = dest.substring(0,2)
            if (board.turn === Color.WHITE) {
                promotionPiece = Piece.forSymbol(promo.toUpperCase())
            } else {
                promotionPiece = Piece.forSymbol(promo)
            }
        }
        const origInd = Move.SQUARE_INDICES[orig as keyof typeof Move.SQUARE_INDICES]
        const destInd = Move.SQUARE_INDICES[dest as keyof typeof Move.SQUARE_INDICES]
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
            let move = legalMoves[0]
            // Set wildcand flag
            move.wildcard = true
            return move
        }
    }
    // Check if the given value is a valid 0x88 board index
    static isValidIndex (ind: number) {
        return (
            (0 <= ind && ind <= 7) ||
            (16 <= ind && ind <= 23) ||
            (32 <= ind && ind <= 39) ||
            (48 <= ind && ind <= 55) ||
            (64 <= ind && ind <= 71) ||
            (80 <= ind && ind <= 87) ||
            (96 <= ind && ind <= 103) ||
            (112 <= ind && ind <= 119)
        )
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
            san += board.disambiguate(move)
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
        return Move.SQUARE_NAMES[i as keyof typeof Move.SQUARE_NAMES]
    }
}
export default Move
/* ===============================================================
   0x88 chessboard cheat sheet fron aaronfi's original source code
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
