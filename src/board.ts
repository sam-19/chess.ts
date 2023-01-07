import Color from './color'
import Fen from './fen'
import Flags from './flags'
import Game from './game'
import Log from 'scoped-ts-log'
import Move from './move'
import Turn from './turn'
import Options from './options'
import Piece from './piece'

import { ChessBoard } from '../types/board'
import { MethodOptions } from '../types/options'
import { PlayerColor } from '../types/color'
import Annotation from './annotation'
import { MoveError } from '../types/move'

const SCOPE = 'Board'

/**
 * The board object keeps track of game state and history in this particular line
 * of moves. Variations and continuations branch off new boards that inherit their
 * parent's state and history, building on top of it.
 */
class Board implements ChessBoard {
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
    static readonly PAWN_RANK = {
        [Color.WHITE]: 6,
        [Color.BLACK]: 1
    }

    castlingRights: { [color: string]: Flags }
    continuation: boolean
    enPassantSqr: number | null
    game: Game
    halfMoveCount: number
    history: Turn[]
    id: number
    isMock: boolean
    kingPos: { [color: string]: number | null }
    mockBoard: Board | null
    moveCache = {
        detailed: false,
        includeFen: false,
        includeSan: false,
        moves: [] as Move[]
    }
    parentBoard: Board | null
    parentBranchTurnIndex: number | null
    plyNum: number
    posCount: Map<string, number>
    selectedTurnIndex: number
    squares: Piece[]
    turn: PlayerColor
    turnNum: number

    /**
     * Create an empty board history for the given game.
     * @param game parent game
     * @param fen optional FEN string desdribing the board starting state
     * @param mock is this a mock board (default false)
     */
    constructor (game: Game, fen?: string, mock = false) {
        // Start with full castling rights for both players
        this.castlingRights = {
            [Color.WHITE]: new Flags([Flags.KSIDE_CASTLING, Flags.QSIDE_CASTLING]),
            [Color.BLACK]: new Flags([Flags.KSIDE_CASTLING, Flags.QSIDE_CASTLING])
        }
        this.continuation = false
        this.enPassantSqr = null
        this.game = game
        this.halfMoveCount = 0
        this.history = []
        this.id = game.variations.length
        this.isMock = mock
        this.kingPos = {
            [Color.WHITE]: null,
            [Color.BLACK]: null
        }
        this.mockBoard = null
        this.moveCache = {
            detailed: false,
            includeFen: false,
            includeSan: false,
            moves: [] as Move[]
        }
        this.parentBoard = null
        this.parentBranchTurnIndex = null
        this.plyNum = 0
        this.posCount = new Map<string, number>()
        this.selectedTurnIndex = -1 // -1 means no move is selected; selecting next move returns the first move
        // Create a 0x88 board presentation and populate it with NONE pieces
        this.squares = (new Array(128)).fill(Piece.NONE)
        this.turn = Color.WHITE
        this.turnNum = 1
        if (fen) {
            this.loadFen(fen)
        }
        if (!mock) {
            // Add this board to parent game's board variations
            game.variations.push(this)
        }
    }

    /**
     * Branch a new board variation from a parent board, returning it. The new variation
     * is automatically added to the game's list of board variations.
     * @param parent Board to base the new variations on
     * @param options MethodOptions.Board.createFromParent
     * @return new board variation
     */
    static branchFromParent (parent: Board, options: MethodOptions.Board.branchFromParent = {}) {
        options = Options.Board.branchFromParent().assign(options) as MethodOptions.Board.branchFromParent
        const newBoard = Board.copy(parent)
        if (!options.continuation) {
            newBoard.undoMoves({ move: parent.selectedTurnIndex })
        }
        newBoard.continuation = options.continuation || false
        // Reset history
        newBoard.history = []
        newBoard.parentBoard = parent
        newBoard.parentBranchTurnIndex = parent.selectedTurnIndex
        newBoard.selectedTurnIndex = -1
        return newBoard
    }

    /**
     * Make a copy of another Board.
     * @param orig
     * @return copy
     */
    static copy (orig: Board) {
        const newBoard = new Board(orig.game)
        // Override default properties
        newBoard.castlingRights = {
            [Color.WHITE]: orig.castlingRights[Color.WHITE].copy(),
            [Color.BLACK]: orig.castlingRights[Color.BLACK].copy()
        }
        newBoard.continuation = orig.continuation
        newBoard.enPassantSqr = orig.enPassantSqr
        newBoard.halfMoveCount = orig.halfMoveCount
        newBoard.history = [...orig.history]
        newBoard.kingPos = {
            [Color.WHITE]: orig.kingPos[Color.WHITE],
            [Color.BLACK]: orig.kingPos[Color.BLACK]
        }
        newBoard.moveCache = {
            detailed: orig.moveCache.detailed,
            includeFen: orig.moveCache.includeFen,
            includeSan: orig.moveCache.includeSan,
            moves: orig.moveCache.moves.slice(0)
        }
        newBoard.parentBoard = orig.parentBoard
        newBoard.parentBranchTurnIndex = orig.parentBranchTurnIndex
        newBoard.plyNum = orig.plyNum
        newBoard.posCount = new Map(orig.posCount)
        newBoard.selectedTurnIndex = orig.selectedTurnIndex
        newBoard.squares = [...orig.squares]
        newBoard.turn = orig.turn
        newBoard.turnNum = orig.turnNum
        return newBoard
    }

    /**
     * Get the distance between `square1` and `square2`.
     * @param square1 - Name or index of the first square.
     * @param square2 - Name or index of the second square.
     * @returns Distance in moves (any direction) or -1 on error.
     */
    static distanceBetween (square1: number | string, square2: number | string) {
        let file1 = 0
        let rank1 = 0
        let file2 = 0
        let rank2 = 0
        if (typeof square1 === 'string') {
            square1 = square1.toLowerCase()
            if (!Object.keys(Board.SQUARE_INDICES).includes(square1)) {
                Log.error(`Square ${square1} is not a valid square name.`, SCOPE)
                return -1
            }
            square1 = Board.SQUARE_INDICES[square1 as keyof typeof Board.SQUARE_INDICES]
        } else if (!Object.values(Board.SQUARE_INDICES).includes(square1)) {
            Log.error(`Square ${square1} is not a valid square index.`, SCOPE)
            return -1
        }
        file1 = Board.fileOf(square1)
        rank1 = Board.rankOf(square1)
        if (typeof square2 === 'string') {
            square2 = square2.toLowerCase()
            if (!Object.keys(Board.SQUARE_INDICES).includes(square2)) {
                Log.error(`Square ${square1} is not a valid square name.`, SCOPE)
                return -1
            }
            square2 = Board.SQUARE_INDICES[square2 as keyof typeof Board.SQUARE_INDICES]
        } else if (!Object.values(Board.SQUARE_INDICES).includes(square2)) {
            Log.error(`Square ${square2} is not a valid square index.`, SCOPE)
            return -1
        }
        file2 = Board.fileOf(square2)
        rank2 = Board.rankOf(square2)
        return Math.max(Math.abs(file2 - file1), Math.abs(rank2 - rank1))
    }

    /**
     * Get file index of a 0x88 position index
     * @param p position index
     * @return 0-7
     */
    static fileOf (p: number) {
        return p & 15
    }

    /**
     * Check if the given square index is a valid 0x88 position.
     * @param index square index
     * @returns true/false
     */
    static isValidSquareIndex (index: number) {
        return (index in Board.SQUARE_NAMES)
    }

    /**
     * Check if the given string is a valid algebraic square name.
     * @param index square index
     * @returns true/false
     */
    static isValidSquareName (name: string) {
        return (name in Board.SQUARE_INDICES)
    }

    /***
     * Get rank index of a 0x88 position index
     * @param p position index
     * @return 0-7
     */
    static rankOf (p: number) {
        return p >> 4
    }

    static squareIndex (square: number | string): number {
        // Seperate check for algebraic and 0x88 index lookups
        if (typeof square === 'number') {
            if (!Board.isValidSquareIndex(square)) {
                Log.error(`Cannot convert ${square} to board square index: Value is not a valid 0x88 board square.`, SCOPE)
                return -1
            }
            return square
        } else {
            if (!Board.isValidSquareName(square)) {
                Log.error(`Cannot convert ${square} to board square index: Value is not a valid algebraic representation of a square.`, SCOPE)
                return -1
            }
            return Board.SQUARE_INDICES[square as keyof typeof Board.SQUARE_INDICES]
        }
    }

    /**
     * Get algebraic representation of a 0x88 square index.
     * @param square position index
     */
     static squareToAlgebraic (square: number) {
        if (!Board.isValidSquareIndex(square)) {
            return null
        }
        return Board.SQUARE_NAMES[square as keyof typeof Board.SQUARE_NAMES]
    }

    /*
     * ======================================================================
     *                             GETTERS
     * ======================================================================
     */

    get breaks50MoveRule () {
        return (this.halfMoveCount >= 100)
    }

    get breaks75MoveRule () {
        return (this.halfMoveCount >= 150)
    }

    get endResult () {
        if (this.isInCheckmate) {
            if (this.turn === Color.BLACK) {
                return {
                    result: {
                        [Color.WHITE]: Game.RESULT.WIN_BY.CHECKMATE,
                        [Color.BLACK]: Game.RESULT.LOSS_BY.CHECKMATE,
                    },
                    headers: '1-0',
                }
            } else {
                return {
                    result: {
                        [Color.WHITE]: Game.RESULT.LOSS_BY.CHECKMATE,
                        [Color.BLACK]: Game.RESULT.WIN_BY.CHECKMATE,
                    },
                    headers: '0-1',
                }
            }
        } else if (this.isInStalemate) {
            return {
                result: {
                    [Color.WHITE]: Game.RESULT.DRAW_BY.STALEMATE,
                    [Color.BLACK]: Game.RESULT.DRAW_BY.STALEMATE,
                },
                headers: '1/2-1/2',
            }
        } else if (this.breaks75MoveRule) {
            return {
                result: {
                    [Color.WHITE]: Game.RESULT.DRAW_BY.SEVENTYFIVE_MOVE_RULE,
                    [Color.BLACK]: Game.RESULT.DRAW_BY.SEVENTYFIVE_MOVE_RULE,
                },
                headers: '1/2-1/2',
            }
        } else if (this.game.useStrictRules && this.breaks50MoveRule) {
            return {
                result: {
                    [Color.WHITE]: Game.RESULT.DRAW_BY.FIFTY_MOVE_RULE,
                    [Color.BLACK]: Game.RESULT.DRAW_BY.FIFTY_MOVE_RULE,
                },
                headers: '1/2-1/2',
            }
        } else if (this.hasRepeatedFivefold) {
            return {
                result: {
                    [Color.WHITE]: Game.RESULT.DRAW_BY.FIVEFOLD_REPETITION,
                    [Color.BLACK]: Game.RESULT.DRAW_BY.FIVEFOLD_REPETITION,
                },
                headers: '1/2-1/2',
            }
        } else if (this.game.useStrictRules && this.hasRepeatedThreefold) {
            return {
                result: {
                    [Color.WHITE]: Game.RESULT.DRAW_BY.THREEFOLD_REPETITION,
                    [Color.BLACK]: Game.RESULT.DRAW_BY.THREEFOLD_REPETITION,
                },
                headers: '1/2-1/2',
            }
        }
        return null
    }

    get hasInsufficientMaterial () {
        const pieceCount = {} as { [key: string]: number}
        const bishops = []
        let totalPieces = 0
        let sqrType = 0 // For checking which type of square a bishop is on
        for (let i=Board.SQUARE_INDICES.a8; i<=Board.SQUARE_INDICES.h1; i++) {
            if (i & 0x88) {
                i += 7
                continue // Outside the "physical" board
            }
            sqrType = (sqrType + 1)%2
            const piece = this.squares[i]
            // Piece.NONE is a special case and its type has to be fetched directly
            if (piece.type !== Piece.NONE.type) {
                pieceCount[piece.type] = ((piece.type in pieceCount) ? pieceCount[piece.type] + 1 : 1)
                if (piece.type === Piece.TYPE_BISHOP) {
                    bishops.push(sqrType)
                }
                totalPieces++
            }
        }
        // Without a question, the game has insufficient material for checkmate if:
        // - both sides have only a king
        // - one side has only a king and one has king + knight/bishop
        // - the board has only bishops (of either color) on same square type in addition to kings
        if (totalPieces === 2) {
            return true // Each side has only king remaining
        } else if (totalPieces === 3 && (pieceCount[Piece.TYPE_BISHOP] === 1 || pieceCount[Piece.TYPE_KNIGHT] === 1)) {
            return true // One side has king and the other king and bishop/knight
        } else if (totalPieces === pieceCount[Piece.TYPE_BISHOP] + 2) {
            const bSum = bishops.reduce((a, b) => a + b, 0)
            return (bSum === 0 || bSum === bishops.length)
        } else {
            return false
        }
    }

    get hasRepeatedFivefold () {
        return Array.from(this.posCount.values()).some(count => count >= 5)
    }

    get hasRepeatedThreefold () {
        return Array.from(this.posCount.values()).some(count => count >= 3)
    }

    get isDraw () {
        // By official over-the-board rules, half move limit is 100 if a player notices it, or 150 automatically
        return (
            this.isInStalemate || this.hasInsufficientMaterial ||
            this.breaks75MoveRule || this.hasRepeatedFivefold ||
            (this.game.useStrictRules && this.hasRepeatedThreefold) ||
            (this.game.useStrictRules && this.breaks50MoveRule)
        )
    }

    get isFinished () {
        if (this.isInCheckmate || this.isDraw) {
            return true
        }
        return false
    }

    get isInCheck () {
        return this.isAttacked(
            Color.swap(this.turn), this.kingPos[this.turn]
        ) as boolean
    }

    get isInCheckmate () {
        return (this.isInCheck && this.generateMoves({ skipCheckmate: true }).length === 0)
    }

    get isInStalemate () {
        return (!this.isInCheck && this.generateMoves({ skipCheckmate: true }).length === 0)
    }

    get selectedTurn () {
        return this.history[this.selectedTurnIndex]
    }

    get turnIndexPosition () {
        return [this.selectedTurnIndex, this.history.length]
    }

    /*
     * ======================================================================
     *                             METHODS
     * ======================================================================
     */

    commitMove (move: Move, updatePosCount = true) {
        // Determine active and opposing player
        const active = this.turn
        const opponent = Color.swap(this.turn)
        let removedPiece = Piece.NONE
        // Move the piece to destination square and clear origin square
        this.squares[move.dest as number] = this.squares[move.orig as number]
        this.squares[move.orig as number] = Piece.NONE
        // Remove a pawn captured en passant
        if (move.flags.contains(Flags.EN_PASSANT)) {
            if (active === Color.WHITE) {
                // The captured pawn is one rank below destination square
                removedPiece = this.removePiece(move.dest as number + 16) as Piece
            } else {
                // The captured pawn is one rank above destination square
                removedPiece = this.removePiece(move.dest as number - 16) as Piece
            }
        } else if (move.flags.contains(Flags.PROMOTION)) {
            // Replace pawn with promotion piece
            removedPiece = this.placePiece(move.promotionPiece as Piece, move.dest as number) as Piece
        }
        // Handle special king moves
        if (move.movedPiece.type === Piece.TYPE_KING) {
            this.kingPos[active] = move.dest
            // Handle rook moves when castling
            if (move.flags.contains(Flags.KSIDE_CASTLING)) {
                this.squares[move.dest as number - 1] = this.squares[move.dest as number + 1]
                this.squares[move.dest as number + 1] = Piece.NONE
            } else if (move.flags.contains(Flags.QSIDE_CASTLING)) {
                this.squares[move.dest as number + 1] = this.squares[move.dest as number - 2]
                this.squares[move.dest as number - 2] = Piece.NONE
            }
            // This player can no longer castle
            this.castlingRights[active].clear()
        }
        // Remove castling rights if rook is moved
        if (this.castlingRights[active].length) {
            if (active === Color.WHITE) {
                if (move.orig === Board.SQUARE_INDICES.a1) {
                    this.castlingRights[active].remove(Flags.QSIDE_CASTLING, true) // Do a silent remove
                } else if (move.orig === Board.SQUARE_INDICES.h1) {
                    this.castlingRights[active].remove(Flags.KSIDE_CASTLING, true)
                }
            } else {
                if (move.orig === Board.SQUARE_INDICES.a8) {
                    this.castlingRights[active].remove(Flags.QSIDE_CASTLING, true)
                } else if (move.orig === Board.SQUARE_INDICES.h8) {
                    this.castlingRights[active].remove(Flags.KSIDE_CASTLING, true)
                }
            }
        }
        // Remove castling rights if rook is captured
        if (this.castlingRights[opponent].length) {
            if (opponent === Color.WHITE) {
                if (move.dest === Board.SQUARE_INDICES.a1) {
                    this.castlingRights[opponent].remove(Flags.QSIDE_CASTLING, true)
                } else if (move.dest === Board.SQUARE_INDICES.h1) {
                    this.castlingRights[opponent].remove(Flags.KSIDE_CASTLING, true)
                }
            } else {
                if (move.dest === Board.SQUARE_INDICES.a8) {
                    this.castlingRights[opponent].remove(Flags.QSIDE_CASTLING, true)
                } else if (move.dest === Board.SQUARE_INDICES.h8) {
                    this.castlingRights[opponent].remove(Flags.KSIDE_CASTLING, true)
                }
            }
        }
        // Record en passant if pawn makes double advance
        if (move.flags.contains(Flags.DOUBLE_ADV)) {
            if (active === Color.WHITE) {
                this.enPassantSqr = move.dest + Move.DOWN // En passant square is one rank below the pawn
            } else {
                this.enPassantSqr = move.dest + Move.UP // En passant square is one rank above the pawn
            }
        } else {
            this.enPassantSqr = null
        }
        // Prepare the state for next move
        this.plyNum++
        this.turnNum = Math.floor(this.plyNum/2) + 1
        this.turn = Color.swap(this.turn) as PlayerColor
        this.resetMoveCache()
        const fen  = this.toFen({ meta: false })
        // Reset half move counter and three fold repetition counter if a pawn moves or capture takes place
        if (move.movedPiece.type === Piece.TYPE_PAWN
            || move.flags.contains(Flags.CAPTURE)
            || move.flags.contains(Flags.EN_PASSANT)
        ) {
            this.halfMoveCount = 0
            if (updatePosCount) {
                this.posCount = new Map<string, number>()
            }
        } else {
            this.halfMoveCount++
        }
        if (updatePosCount) {
            if (this.posCount.has(fen)) {
                this.posCount.set(fen, this.posCount.get(fen) || 0 + 1)
            } else {
                this.posCount.set(fen, 1)
            }
        }
        return removedPiece
    }

    commitUndoMoves (moves: Turn[]) {
        // Revert board state to match the first move on the list
        this.castlingRights = {
            [Color.WHITE]: moves[0].castlingRights[Color.WHITE].copy(),
            [Color.BLACK]: moves[0].castlingRights[Color.BLACK].copy()
        }
        this.kingPos = {
            [Color.WHITE]: moves[0].kingPos[Color.WHITE],
            [Color.BLACK]: moves[0].kingPos[Color.BLACK]
        }
        this.turn = moves[0].turn
        this.enPassantSqr = moves[0].enPassantSqr
        this.turnNum = moves[0].turnNum
        this.plyNum = moves[0].plyNum
        this.halfMoveCount = moves[0].halfMoveCount
        // Reverse the moves to start from the last
        moves.reverse()
        // Undo the moves in turn history
        for (let i=0; i<moves.length; i++) {
            const move = moves[i].move
            // Undo capture and en passant
            if (move.flags.contains(Flags.CAPTURE) || move.flags.contains(Flags.EN_PASSANT)) {
                this.squares[move.dest as number] = move.capturedPiece as Piece
            } else {
                this.squares[move.dest as number] = Piece.NONE
            }
            // Undo castling
            if (move.flags.contains(Flags.KSIDE_CASTLING)) {
                this.squares[move.dest as number + 1] = this.squares[move.dest as number - 1]
                this.squares[move.dest as number - 1] = Piece.NONE
            } else if (move.flags.contains(Flags.QSIDE_CASTLING)) {
                this.squares[move.dest as number - 2] = this.squares[move.dest as number + 1]
                this.squares[move.dest as number + 1] = Piece.NONE
            }
            this.squares[move.orig as number] = move.movedPiece as Piece
            this.resetMoveCache()
        }
    }

    disambiguateMove (move: Move) {
        // Always add a file identifier to pawn captures
        if (move.movedPiece?.type === Piece.TYPE_PAWN) {
            if (move.flags?.contains(Flags.CAPTURE) || move.flags?.contains(Flags.EN_PASSANT)) {
                return Board.squareToAlgebraic(move.orig)?.charAt(0) || ""
            } else {
                return ""
            }
        }
        const moves = this.generateMoves()
        let ambiguities = false
        let sameRank = false
        let sameFile = false
        for (let i=0; i<moves.length; i++) {
            // Check if a move by another piece of the same type ends on the same square
            // No point in doing more checks if we have determined that some other moves originate
            // from both the same rank and file
            if (move.movedPiece === moves[i].movedPiece
                && move.orig !== moves[i].orig && move.dest === moves[i].dest
                && (!sameRank || !sameFile))
            {
                ambiguities = true
                if (!sameRank && Board.rankOf(move.orig) === Board.rankOf(moves[i].orig)) {
                    sameRank = true
                }
                if (!sameFile && Board.fileOf(move.orig) === Board.fileOf(moves[i].orig)) {
                    sameFile = true
                }
            }
        }
        // Construct the prefix
        if (ambiguities) {
            if (sameFile && sameRank) {
                return Board.squareToAlgebraic(move.orig) || ""
            } else if (sameFile) { // Need only the rank number
                return Board.squareToAlgebraic(move.orig)?.charAt(1) || ""
            } else { // Need only the file letter
                return Board.squareToAlgebraic(move.orig)?.charAt(0) || ""
            }
        }
        return ""
    }

    generateMoves (opts: MethodOptions.Board.generateMoves = {}) {
        const options = Options.Board.generateMoves().assign(opts) as MethodOptions.Board.generateMoves
        // Check if there are already moves cached for this turn
        // If SAN or FEN is requested and not included in cached moves, we have to calculate them
        if (this.moveCache.moves.length
            && (!options.includeSan || this.moveCache.includeSan)
            && (!options.includeFen || this.moveCache.includeFen)
            && (!options.detailed || this.moveCache.detailed)
        )  {
            if (!options.onlyLegal) {
                return this.moveCache.moves
            }
            // Else we'll check for valid moves
            const legalMoves = []
            for (let i=0; i<this.moveCache.moves.length; i++) {
                if (this.moveCache.moves[i].legal)
                    legalMoves.push(this.moveCache.moves[i])
            }
            return legalMoves
        }
        // Declare variables also used in helper function
        const newMoves: Move[] = []
        const active = this.turn
        const opponent = Color.swap(active)
        /**
         * Helper method to add new moves to the list
         */
        const addMove = (orig: number, dest: number, board: Board, flags: number[] = []) => {
            // Get the captured piece, with a special rule for en passant (on rank lower for white, one rank higher for black)
            // Checking board.squares[] looks a bit dull, but considering how many this these methods are called
            // there could be a considerable performance penalty in using board.pieceAt() with its error checking
            const captPiece = (flags.indexOf(Flags.EN_PASSANT) !== -1 ? board.squares[dest + (opponent === Color.BLACK? 16 : -16)] : board.squares[dest])
            const moveOpts = {
                capturedPiece: captPiece,
                dest: dest,
                flags: flags,
                movedPiece: board.squares[orig],
                orig: orig,
                promotionPiece: undefined as Piece | undefined,
            } as MethodOptions.MoveOptions
            // Check if a pawn has reached then last rank for promotion
            if (board.squares[orig].type === Piece.TYPE_PAWN
                && (Board.rankOf(dest) === 0 || Board.rankOf(dest) === 7))
            {
                const promoPieces = (board.turn === Color.WHITE ? Piece.WHITE_PROMO_PIECES : Piece.BLACK_PROMO_PIECES)
                // Each possible promotion is its own move
                promoPieces.forEach((promoPiece) => {
                    moveOpts.promotionPiece = promoPiece
                    const newMove = new Move(moveOpts)
                    if (newMove.error === undefined) {
                        newMoves.push(newMove)
                    } else {
                        Log.error(newMove.error, SCOPE)
                    }
                })
            } else {
                const newMove = new Move(moveOpts)
                if (newMove.error === undefined) {
                    newMoves.push(newMove)
                } else {
                    Log.error(newMove.error, SCOPE)
                }
            }
        }
        // Full square range on the 0x88 board
        let firstSqr = Board.SQUARE_INDICES.a8
        let lastSqr = Board.SQUARE_INDICES.h1
        if (options.onlyForSquare !== undefined && options.onlyForSquare !== null) {
            const onlySqr = Board.squareIndex(options.onlyForSquare)
            // Set first and last squares to the requested square
            if (onlySqr !== -1) {
                firstSqr = lastSqr = Board.SQUARE_INDICES[options.onlyForSquare as keyof typeof Board.SQUARE_INDICES]
            } else {
                return []
            }
        }
        // Loop through all squares. TODO: Potential for performance improvement?
        for (let i=firstSqr; i<=lastSqr; i++) {
            // Check that we're still on actual board squares
            // Bitwise checking for this is, at least in theory, considerably faster than say just checking each
            // square for Piece.NONE (which occupies out-of-board squares in the array)
            // https://www.chessprogramming.org/0x88
            if (i & 0x88) {
                // Skip to next rank
                i += 7
                continue
            }
            const piece = this.squares[i]
            // Don't calculate moves for empty squares or opponent pieces
            if (piece === Piece.NONE || piece.color !== active) {
                continue
            }
            // Pawn moves
            if (piece.type === Piece.TYPE_PAWN) {
                // Single square advancement moves
                let sqr = i + Move.PAWN_OFFSETS[active as keyof typeof Move.PAWN_OFFSETS][0]
                if (this.squares[sqr] === Piece.NONE) {
                    addMove(i, sqr, this, [Flags.NORMAL])
                    // If the first square was vacant, check for double advancement
                    sqr = i + Move.PAWN_OFFSETS[active as keyof typeof Move.PAWN_OFFSETS][1]
                    // The move must originate from the pawn rank and destination square must be vacant
                    if (Board.PAWN_RANK[active] === Board.rankOf(i)) {
                        if (this.squares[sqr] === Piece.NONE) {
                            addMove(i, sqr, this, [Flags.DOUBLE_ADV])
                        } else {
                            addMove(i, sqr, this, [Flags.MOVE_BLOCKED])
                        }
                    }
                } else {
                    // Add moves as blocked
                    addMove(i, sqr, this, [Flags.MOVE_BLOCKED])
                    if (Board.PAWN_RANK[active] === Board.rankOf(i)) {
                        addMove(i, i + Move.PAWN_OFFSETS[active as keyof typeof Move.PAWN_OFFSETS][1], this, [Flags.MOVE_BLOCKED])
                    }
                }
                // Capture moves
                for (let j=2; j<4; j++) {
                    sqr = i + Move.PAWN_OFFSETS[active as keyof typeof Move.PAWN_OFFSETS][j]
                    if (sqr & 0x88) { // Dont' check out of board squares
                        continue
                    } else if (this.squares[sqr] !== Piece.NONE && this.squares[sqr].color === opponent) {
                        addMove(i, sqr, this, [Flags.CAPTURE])
                    } else if (sqr === this.enPassantSqr) { // En passant capture
                        addMove(i, sqr, this, [Flags.EN_PASSANT])
                    }
                }
            } else {
                // Non-pawn pieces (or actual pieces)
                for (let j=0; j<Move.PIECE_OFFSETS[piece.type as keyof typeof Move.PIECE_OFFSETS].length; j++) {
                    const offset = Move.PIECE_OFFSETS[piece.type as keyof typeof Move.PIECE_OFFSETS][j]
                    let sqr = i + offset
                    let dirBlocked = false
                    while (!(sqr & 0x88)) {
                        // Check for squares on the "physical" board
                        if (dirBlocked) {
                            // Add rest of the blocked moves
                            addMove(i, sqr, this, [Flags.MOVE_BLOCKED])
                            sqr += offset
                            continue
                        }
                        if (this.squares[sqr] === Piece.NONE) {
                            addMove(i, sqr, this, [Flags.NORMAL])
                        } else {
                            if (this.squares[sqr].color !== active) {
                                addMove(i, sqr, this, [Flags.CAPTURE])
                            } else {
                                addMove(i, sqr, this, [Flags.MOVE_BLOCKED])
                            }
                            dirBlocked = true
                        }
                        // Knight and king can only make one move in each direction
                        if (piece.type === Piece.TYPE_KING || piece.type === Piece.TYPE_KNIGHT) {
                            break
                        }
                        // Next square in the direction of movement
                        sqr += offset
                    }
                }
            }
            // Castling moves are only checked if the piece is a king or we are calculating all moves
            // Calling indexOf() is slower than doing bit-wise checking, but we don't have to iterate this too many times
            // Possibly could move to bit-wise checking in the future, as was in aaronfi's ES6 version
            if (i === this.kingPos[active]) {
                // Check that castling is still possible
                const orig = this.kingPos[active] as number
                if (this.castlingRights[active].contains(Flags.KSIDE_CASTLING)) {
                    const dest = orig + 2
                    if (this.squares[orig + 1] !== Piece.NONE
                        || this.squares[dest] !== Piece.NONE // Squares must be vacant
                    ) {
                        addMove(orig, dest, this, [Flags.KSIDE_CASTLING, Flags.MOVE_BLOCKED])
                    } else if (this.isAttacked(opponent, this.kingPos[active]) // Cannot castle a king in check
                        || this.isAttacked(opponent, orig + 1) // Can't castle a king across an attacked square
                        || this.isAttacked(opponent, dest)) // Can't move king into an attacked square
                    {
                        addMove(orig, dest, this, [Flags.KSIDE_CASTLING, Flags.MOVE_ILLEGAL])
                    } else {
                        addMove(orig, dest, this, [Flags.KSIDE_CASTLING])
                    }
                }
                // Same for queen side
                if (this.castlingRights[active].contains(Flags.QSIDE_CASTLING)) {
                    const dest = orig - 2
                    if (this.squares[orig - 1] !== Piece.NONE
                        || this.squares[orig - 2] !== Piece.NONE
                        || this.squares[orig - 3] !== Piece.NONE
                    ) {
                        addMove(orig, dest, this, [Flags.QSIDE_CASTLING, Flags.MOVE_BLOCKED])
                    } else if (this.isAttacked(opponent, orig)
                        || this.isAttacked(opponent, orig - 1)
                        || this.isAttacked(opponent, dest)
                    ) {
                        addMove(orig, dest, this, [Flags.QSIDE_CASTLING, Flags.MOVE_ILLEGAL])
                    } else {
                        addMove(orig, dest, this, [Flags.QSIDE_CASTLING])
                    }
                }
            }
        }
        // Make another array for only legal moves
        const legalMoves = []
        for (const move of newMoves) {
            const tmpBoard = this.makeMockMove(move)
            if (options.includeFen) {
                // Calculating FEN takes time, so only do it if requested
                move.fen = tmpBoard.toFen()
            }
            // Check if this move would leave the active player's king exposed
            const kingAttacked = tmpBoard.isAttacked(opponent, tmpBoard.kingPos[this.turn], options.detailed)
            if (kingAttacked && (kingAttacked === true || kingAttacked.length)) {
                move.flags.add(Flags.PINNED)
                if (options.includeSan) {
                    move.san = Move.toSan(move, this)
                }
                if (options.detailed) {
                    move.detail.set(
                        'attackers',
                        (kingAttacked as number[]).map(
                            num => Board.SQUARE_NAMES[num as keyof typeof Board.SQUARE_NAMES]
                        )
                    )
                }
                move.legal = false
                continue
            }
            // Check for appropriate flags
            if (tmpBoard.isInCheck) {
                // Checking move
                move.flags.add(Flags.CHECK)
                if (!options.skipCheckmate && tmpBoard.isInCheckmate) {
                    // Checkmate move
                    move.flags.add(Flags.CHECKMATE)
                }
            }
            // Now that we have checked for the last flags that affect SAN, we can calculate them
            if (options.includeSan && !options.onlyLegal) {
                move.san = Move.toSan(move, this)
            }
            // Mark blocked moves as illegal and move to the next
            if (move.flags.contains(Flags.MOVE_BLOCKED)) {
                move.legal = false
                continue
            }
            // SAN only for legal moves
            if (options.includeSan && options.onlyLegal) {
                move.san = Move.toSan(move, this)
            }
            move.legal = true
            legalMoves.push(move)
        }
        // Cache moves for this turn
        if (
            // Technically I shouldn't have to check this, but in case I make some changes to the upstream code later
            !this.moveCache.moves.length ||
            // Test if new moves include more information than currently cached ones
            (
                ((this.moveCache.includeFen !== options.includeFen) || (this.moveCache.includeSan !== options.includeSan))
                && (!this.moveCache.includeSan || options.includeSan)
                && (!this.moveCache.includeFen || options.includeFen)
            )
        ) {
            // The `|| false` is just to satisfy Typescript linter
            this.moveCache.includeFen = options.includeFen || false
            this.moveCache.includeSan = options.includeSan || false
            this.moveCache.moves = newMoves
        }
        if (options.onlyLegal) {
            return legalMoves
        } else {
            return newMoves
        }
    }

    getMoves (opts: MethodOptions.Board.getMoves = {}) {
        let moveDataType: { move: Move, fen: string, algebraic: string, san: string, uci: string }
        let finalMovesType: { blocked: typeof moveDataType[], illegal: typeof moveDataType[], legal: typeof moveDataType[] }
        const options = Options.Board.getMoves().assign(opts) as MethodOptions.Board.getMoves
        const moves = this.generateMoves({
            detailed: options.detailed,
            includeSan: options.notation === 'all' || options.notation === 'san',
            includeFen: options.includeFen,
            onlyLegal: options.filter === 'legal'
        })
        const finalMoves = { blocked: [], illegal: [], legal: [] } as typeof finalMovesType
        for (const move of moves) {
            const moveData = {} as typeof moveDataType
            //Skip moves that are not requested
            if ((options.filter === 'legal' && !move.legal)
                || (options.filter === 'illegal' && (move.legal)) // Blocked moves are also illegal
                || (options.filter === 'blocked' && (move.legal || !move.flags?.contains(Flags.MOVE_BLOCKED)))
                || (options.onlyForSquare && (move.algebraic?.substring(0,2) !== options.onlyForSquare))
            ) {
                continue
            }
            moveData.move = move
            if (options.includeFen) {
                moveData.fen = move.fen || ''
            }
            // Populate notation fields
            if (options.onlyDestinations) {
                // Destinations are always the same
                moveData.algebraic = move.algebraic?.substring(3,5) || ''
            } else {
                if (options.notation == 'all') {
                    moveData.algebraic = move.algebraic || ''
                    moveData.san = move.san || ''
                    moveData.uci = (move.algebraic?.substring(0,2) || '') + (move.algebraic?.substring(3) || '')
                } else if (options.notation === 'algebraic') {
                    moveData.algebraic = move.algebraic || ''
                } else if (options.notation === 'san') {
                    moveData.san = move.san || ''
                } else if (options.notation === 'uci') {
                    moveData.uci = (move.algebraic?.substring(0,2) || '') + (move.algebraic?.substring(3) || '')
                }
            }
            // Sort by type
            if (move.legal) {
                finalMoves.legal.push(moveData)
            } else if (move.flags?.contains(Flags.MOVE_BLOCKED)) {
                finalMoves.blocked.push(moveData)
            } else {
                finalMoves.illegal.push(moveData)
            }
        }
        return finalMoves
    }

    isAttacked (attacker: PlayerColor, square: number | null, detailed = false) {
        // If target piece is not on the board, it cannot be attacked
        if (square === null) {
            return false
        }
        // Initialize an array of attackers for detailed reporting
        const attackers = []
        for (let i=Board.SQUARE_INDICES.a8; i<=Board.SQUARE_INDICES.h1; i++) {
            if (i & 0x88) {
                i += 7
                continue // Not a "physical" square
            } else if (this.squares[i] === Piece.NONE || this.squares[i].color !== attacker) {
                continue // Empty square or a friendly piece can't attack a square
            }
            const diff = i - square as number
            const idx = diff + 119 // On a 0x88 board
            const piece = this.squares[i]
            if (Move.ATTACKS[idx] & (1 << Move.SHIFTS[piece.type as keyof typeof Move.SHIFTS])) {
                // TODO: Find out the actual math behind this bit-wise comparison
                if (piece.type === Piece.TYPE_PAWN) {
                    // White pawn can only capture on higher and black pawn on lower rank
                    if (diff > 0 && piece.color === Color.WHITE) {
                        if (!detailed) {
                            return true
                        } else {
                            attackers.push(i)
                        }
                    } else if (diff < 0 && piece.color === Color.BLACK) {
                        if (!detailed) {
                            return true
                        } else {
                            attackers.push(i)
                        }
                    } else {
                        continue
                    }
                } else if (piece.type === Piece.TYPE_KING || piece.type === Piece.TYPE_KNIGHT) {
                    // King or knight moves cannot be blocked, so no need to check for that
                    if (!detailed) {
                        return true
                    } else {
                        attackers.push(i)
                        continue
                    }
                }
                // Do checks for blocked rays
                const offset = Move.RAYS[idx]
                let j = i + offset
                let blocked = false
                while (j !== square) {
                    if (this.squares[j] !== Piece.NONE) {
                        blocked = true // There is a piece blocking the ray to this square
                        break // Move on to check next possible attacker
                    }
                    j += offset // Continue from next square along the ray
                }
                if (!blocked) { // We know at least one piece is attacking this square
                    if (!detailed) {
                        return true
                    } else {
                        attackers.push(i)
                    }
                }
            }
        }
        if (!detailed) {
            // If this point is reached, no pieces were found that could attack the square
            return false
        } else {
            // Or return the list of attackers
            return attackers
        }
    }

    isNewMove (move: Move) {
        // This method really exists just so I could call this check directly from Game
        if (this.selectedTurnIndex + 1 === this.history.length) {
            // Must be new if we're at the end of history
            return { isNew: true, contIdx: -1, varIdx: -1 }
        }
        // Is this move equal to the next move in history
        if (this.history[this.selectedTurnIndex + 1].move.san === move.san || move.wildcard) {
            return { isNew: false, contIdx: -1, varIdx: -1 }
        }
        // Does any continuation of the current move match the attempted move
        if (this.selectedTurnIndex >= 0) { // index is -1 before first move
            const curVars = this.history[this.selectedTurnIndex].variations
            for (let i=0; i<curVars.length; i++) {
                if (curVars[i].continuation && curVars[i].history[0].move.algebraic === move.algebraic) {
                    return { isNew: false, contIdx: i, varIdx: -1 }
                }
            }
        }
        // Does any variation of the next move in history match the attempted move
        const nextVars = this.history[this.selectedTurnIndex + 1].variations
        for (let i=0; i<nextVars.length; i++) {
            if (!nextVars[i].continuation // Skip continuations
                && (nextVars[i].history[0].move.algebraic === move.algebraic
                || nextVars[i].history[0].move.wildcard))
            {
                return { isNew: false, contIdx: -1, varIdx: i }
            }
        }
        // No matching moves in history
        return { isNew: true, contIdx: -1, varIdx: -1 }
    }

    loadFen (fen: string) {
        // Check that given FEN is valid
        const gameFen = new Fen(fen)
        const fenError = gameFen.validate()
        if (fenError.errorCode) {
            Log.error(`Cannot create variation from FEN: ${fenError.errorMessage} (${fen}).`, SCOPE)
            return false
        }
        // Reset properties
        this.enPassantSqr = null
        this.history = []
        this.kingPos = {
            [Color.WHITE]: null,
            [Color.BLACK]: null
        }
        this.posCount = new Map<string, number>()
        this.squares = (new Array(128)).fill(Piece.NONE)
        this.resetMoveCache()
        // Assign pieces
        const params = fen.split(/\s+/)
        const pos = params[0]
        let sqr = 0
        // Assing pieces
        for (let i = 0; i < pos.length; i++) {
            const sym = pos.charAt(i)
            if (sym === '/') {
                sqr += 8
            } else if ('0123456789'.indexOf(sym) !== -1) {
                sqr += parseInt(sym, 10)
            } else {
                this.placePiece(Piece.forSymbol(sym), sqr)
                sqr++
            }
        }
        this.turn = params[1] as PlayerColor
        this.castlingRights[Color.WHITE] = new Flags()
        this.castlingRights[Color.BLACK] = new Flags()
        // Check for remaining castling rights
        if (params[2].indexOf('K') > -1) {
            this.castlingRights[Color.WHITE].add(Flags.KSIDE_CASTLING)
        }
        if (params[2].indexOf('Q') > -1) {
            this.castlingRights[Color.WHITE].add(Flags.QSIDE_CASTLING)
        }
        if (params[2].indexOf('k') > -1) {
            this.castlingRights[Color.BLACK].add(Flags.KSIDE_CASTLING)
        }
        if (params[2].indexOf('q') > -1) {
            this.castlingRights[Color.BLACK].add(Flags.QSIDE_CASTLING)
        }
        // Is there an en-passant square
        this.enPassantSqr = (params[3] === '-') ? null
                            : Board.SQUARE_INDICES[params[3] as keyof typeof Board.SQUARE_INDICES]
        this.halfMoveCount = parseInt(params[4], 10)
        this.turnNum = parseInt(params[5], 10)
        this.plyNum = (this.turnNum - 1)*2 + (this.turn === Color.BLACK ? 1 : 0)
        this.posCount.set(this.toFen({ meta: false }), 1)
        return true
    }

    makeMockMove (move: Move, reset = true) {
        if (!this.mockBoard) {
            this.mockBoard = new Board(this.game, this.toFen(), true)
        }
        if (reset && this.mockBoard) {
            this.mockBoard.castlingRights = {
                [Color.WHITE]: this.castlingRights[Color.WHITE].copy(),
                [Color.BLACK]: this.castlingRights[Color.BLACK].copy()
            }
            this.mockBoard.enPassantSqr = this.enPassantSqr
            this.mockBoard.halfMoveCount = this.halfMoveCount
            this.mockBoard.history = []
            this.mockBoard.kingPos = {
                [Color.WHITE]: this.kingPos[Color.WHITE],
                [Color.BLACK]: this.kingPos[Color.BLACK]
            }
            this.mockBoard.moveCache = {
                detailed: false,
                includeFen: false,
                includeSan: false,
                moves: [],
            }
            this.mockBoard.plyNum = this.plyNum
            this.mockBoard.posCount = new Map(this.posCount)
            this.mockBoard.squares = [...this.squares] // Can't copy mutable array directly
            this.mockBoard.selectedTurnIndex = this.selectedTurnIndex
            this.mockBoard.turn = this.turn
            this.mockBoard.turnNum = this.turnNum
        }
        this.mockBoard.makeMove(move, { isPlayerMove: false })
        // Return mock board state
        return this.mockBoard
    }

    makeMove (move: Move, opts: MethodOptions.Board.makeMove = {}) {
        const options = Options.Board.makeMove().assign(opts) as MethodOptions.Board.makeMove
        // Handle user moves
        if (options.isPlayerMove) {
            // Check if there is a next move in history and if it is equal to this move (only happens with take-backs)
            if (this.selectedTurnIndex + 1 < this.history.length) {
                // If this move is equal to the next move in history, simply go to that move
                const { isNew, contIdx, varIdx } = this.isNewMove(move)
                if (!isNew) {
                    // Move already exists
                    if (contIdx !== -1) {
                        // Enter the continuation
                        Log.debug("Attempted move was already a continuation of the current move.", SCOPE)
                        if (this.game.enterContinuation(contIdx)) {
                            return this.game.currentBoard.history[0]
                        } else {
                            return { error: `Cound not enter existing continuation.` } as MoveError
                        }
                    } else {
                        // The move is either the next move in history or one of its variations
                        const logLvl = Log.getPrintThreshold()
                        Log.setPrintThreshold("DISABLE") // Do not log next move
                        this.nextTurn()
                        Log.setPrintThreshold(logLvl)
                        if (varIdx !== -1) {
                            // Enter the correct variation
                            Log.debug("Attempted move was already a variation of the next move in history.", SCOPE)
                            if (this.game.enterVariation(varIdx)) {
                                return this.game.currentBoard.history[0]
                            } else {
                                return { error: `Cound not enter existing variation.` } as MoveError
                            }
                        } else {
                            Log.debug("Attempted move was equal to already existing next move in history.", SCOPE)
                            return this.history[this.selectedTurnIndex]
                        }
                    }
                } else {
                    Log.debug("Branching a new variation", SCOPE)
                    // New move; branch a new variation
                    // We have to make the next move so that we can take it back when parsing the variation
                    // (kinda stupid, I know, but that's how a variation is defined)
                    this.nextTurn()
                    const turn = this.selectedTurn
                    const newBoard = Board.branchFromParent(this, { continuation: false })
                    turn.variations.push(newBoard)
                    newBoard.makeMove(move, options)
                    this.game.currentBoard = newBoard
                    return turn
                }
            }
            // Check if any continuation of the current move matches attempted move
            if (this.history[this.selectedTurnIndex] && this.history[this.selectedTurnIndex].variations.length) {
                const childVars = this.history[this.selectedTurnIndex].variations
                for (let i=0; i < childVars.length; i++) {
                    if (childVars[i].continuation // Only continuations
                        && (childVars[i].history[0].move.san === move.san
                        || childVars[i].history[0].move.wildcard))
                    {
                        if (this.game.enterContinuation(i)) {
                            return this.game.currentBoard.history[0]
                        } else {
                            return { error: `Cound not enter existing continuation.` }
                        }
                    }
                }
            }
        }
        // We're at the end of turn history or this is not a user move
        // Record move time and delta from last move
        const meta = {} as { moveTime: number, moveTimeDelta: number, comments: string, puzzleSolution: boolean }
        if (this.history.length) {
            if (!options.moveTime) {
                meta.moveTime = Date.now()
            }
            if (!options.moveTimeDelta) {
                meta.moveTimeDelta = meta.moveTime - (this.history[this.selectedTurnIndex - 1]?.meta?.moveTime || 0)
            }
        }
        // Store a unique identifier for this move
        const lastMove = this.history[this.history.length - 1]
        const moveId = this.plyNum.toString()
                       + (lastMove?.move?.uci || '')
                       + (move.wildcard ? Move.WILDCARD_MOVES[0] : move.uci)
        const newMove = new Turn({
            castlingRights : {
                [Color.WHITE]: this.castlingRights[Color.WHITE].copy(),
                [Color.BLACK]: this.castlingRights[Color.BLACK].copy()
            },
            fen: this.toFen(),
            enPassantSqr: this.enPassantSqr,
            halfMoveCount: this.halfMoveCount,
            id: moveId,
            kingPos: this.kingPos,
            meta: meta,
            move: move,
            plyNum: this.plyNum,
            turn: this.turn,
            turnNum: this.turnNum,
        })
        // TODO: Handle removed pawn when promoting
        //const removedPiece = this.commitMove(move, options.updatePosCount)
        this.commitMove(move, options.updatePosCount)
        this.selectedTurnIndex++
        if (options.comment) {
            this.selectedTurn.annotations.push(new Annotation(options.comment))
        }
        this.history.splice(this.selectedTurnIndex, 0, newMove)
        // TODO: Check if the main variation (and thus the game) has finished
        if (options.isPlayerMove && !this.id && this.isFinished) {
            Log.debug('Main variation finished', SCOPE)
        }
        return newMove
    }

    makeMoveFromAlgebraic (orig: string, dest: string, options: MethodOptions.Board.makeMove = {}) {
        const move = Move.generateFromAlgebraic(orig, dest, this)
        if (!Object.prototype.hasOwnProperty.call(move, 'error')) {
            Log.debug(`Making a move from algebraic: ${orig}-${dest}.`, SCOPE)
            return this.makeMove(move as Move, options)
        } else {
            Log.error(`Cound not make move from algebraic (${orig}-${dest}): ${move.error}`, SCOPE)
            return move as MoveError
        }
    }

    makeMoveFromSAN (san: string, options: MethodOptions.Board.makeMove = {}) {
        const move = Move.generateFromSan(san, this)
        if (!Object.prototype.hasOwnProperty.call(move, 'error')) {
            Log.debug(`Making a move from SAN: ${san}.`, SCOPE)
            return this.makeMove(move as Move, options)
        } else {
            return move as MoveError
        }
    }

    nextTurn () {
        // Check that we're not already at the end of turn history
        if (this.selectedTurnIndex === this.history.length - 1) {
            Log.warn("Could not select next turn; already at the end of turn history.", SCOPE)
            return false
        }
        return this.selectTurn(this.selectedTurnIndex + 1)
    }

    pieceAt (square: number | string): Piece {
        square = Board.squareIndex(square)
        if (square >= 0) {
            return this.squares[square]
        } else {
            return Piece.NONE
        }
    }

    placePiece (piece: Piece, square: number | string) {
        // Check that piece and square are valid
        if (!(piece.symbol in Piece.PIECES)) {
            Log.error(`Cannot put piece to requested square: Piece (${piece}) is invalid.`, SCOPE)
            return false
        }
        square = Board.squareIndex(square)
        if (square >= 0) {
            // Each player may have only one king on the board
            if (piece.type === Piece.TYPE_KING && this.kingPos[piece.color] !== null) {
                Log.error("Cannot have more than one king per side.", SCOPE)
                return false
            }
            // Check if there is a piece already in the square and return it (capture)
            const prevPiece = this.pieceAt(square)
            // Place the piece and save possible king position
            this.squares[square] = piece
            if (piece.type === Piece.TYPE_KING) {
                this.kingPos[piece.color] = square
            }
            return prevPiece
        } else {
            Log.error(`Cannot put piece to requested square: Square (${square}) is invalid.`, SCOPE)
            return false
        }

    }

    prevTurn () {
        // Check that we're not already at the start of turn history
        if (this.selectedTurnIndex === -1) {
            Log.warn("Could not select previous turn; already at the start of turn history.", SCOPE)
            return false
        }
        return this.selectTurn(this.selectedTurnIndex - 1)
    }

    removePiece (square: number | string) {
        square = Board.squareIndex(square)
        // Check that square is valid
        if (square < 0) {
            Log.error(`Cannot remove piece from ${square}: Value is not a valid square.`, SCOPE)
            return false
        }
        const piece = this.pieceAt(square)
        if (piece === Piece.NONE) {
            Log.info(`Could not remove piece from ${Board.SQUARE_NAMES[square as keyof typeof Board.SQUARE_NAMES]}: The square was already vacant.`, SCOPE)
        } else if (piece.type === Piece.TYPE_KING) {
            this.kingPos[piece.color] = null
        }
        // Assign empty square
        this.squares[square] = Piece.NONE
        return piece
    }

    resetMoveCache () {
        this.moveCache = {
            detailed: false,
            includeFen: false,
            includeSan: false,
            moves: [],
        }
    }

    selectTurn (index: number) {
        // Check that index is valid
        if (index < -1 || index > this.history.length - 1) {
            Log.warn(`Attempted to select a turn with invalid index: ${index}.`, SCOPE)
            return false
        }
        if (index === this.selectedTurnIndex) {
            // Move is already selected
            Log.info("Attempted to select a turn that was already selected.", SCOPE)
            return true
        }
        Log.debug(`Selecting a new turn from history: ${index}.`, SCOPE)
        // Browse to given move
        // TODO: Allow visual scrolling through the turn history step by step?
        if (index < this.selectedTurnIndex) {
            while (index < this.selectedTurnIndex) {
                this.commitUndoMoves([this.selectedTurn])
                this.selectedTurnIndex--
            }
        } else if (index > this.selectedTurnIndex) {
            while (index > this.selectedTurnIndex) {
                this.selectedTurnIndex++
                this.commitMove(this.selectedTurn.move, false)
            }
        }
        return true
    }

    toFen (opts: MethodOptions.Board.toFen = {}) {
        const options = Options.Board.toFen().assign(opts) as MethodOptions.Board.toFen
        // Count of consecutive empty squares
        let nEmpty = 0
        // Resulting FEN string
        let fen = ""
        // Loop through all the squares
        for (let i=Board.SQUARE_INDICES.a8; i<=Board.SQUARE_INDICES.h1; i++) {
            if (this.squares[i] === Piece.NONE) {
                nEmpty++
            } else {
                if (nEmpty) {
                    // Add empty square count to FEN and reset empty count
                    fen += nEmpty.toString()
                    nEmpty = 0
                }
                fen += this.squares[i]
            }
            if ((i + 1) & 0x88) {
                // New rank
                if (nEmpty) {
                    fen += nEmpty.toString()
                }
                // Print slash if this is not the last rank
                if (i !== Board.SQUARE_INDICES.h1) {
                    fen += "/"
                }
                nEmpty = 0
                i += 8
            }
        }
        // Return just board position if metainfo is not requested
        if (!options.meta) {
            return fen
        }
        // Player in turn
        fen += " " + this.turn
        // Check castling rights
        let cr = ""
        if (this.castlingRights[Color.WHITE].contains(Flags.KSIDE_CASTLING)) cr += 'K'
        if (this.castlingRights[Color.WHITE].contains(Flags.QSIDE_CASTLING)) cr += 'Q'
        if (this.castlingRights[Color.BLACK].contains(Flags.KSIDE_CASTLING)) cr += 'k'
        if (this.castlingRights[Color.BLACK].contains(Flags.QSIDE_CASTLING)) cr += 'q'
        // Add castling flags or - if no castling rights remain
        fen += " " + (cr ? cr : "-")
        // Add enpassant square or - if none exist
        fen += " " + (this.enPassantSqr !== null ? Board.squareToAlgebraic(this.enPassantSqr) : "-")
        // Add half move and move counters
        fen += " " + this.halfMoveCount + " " + this.turnNum
        return fen
    }

    toString () {
        let str = '  +------------------------+  '
        str += this.game.headers.get('black')?.substring(0, 28) || "Black (unknown)"
        str += '\n'
        const boardResult = this.endResult
        const result = boardResult ? boardResult.headers
                       // If this is the root variation and we're at the last move, we can override with game result value
                       : !this.id && this.selectedTurnIndex + 1 === this.history.length
                            ? this.game.headers.get('result') : false
        for (let i = Board.SQUARE_INDICES.a8; i <= Board.SQUARE_INDICES.h1; i++) {
            // Print rank number and the left side of the board
            if (Board.fileOf(i) === 0) {
                str += '87654321'[Board.rankOf(i)] + ' |'
            }
            str += ' ' + this.squares[i] + ' '
            if ((i + 1) & 0x88) {
                str += `|`
                if (i === 7 && this.turn === Color.BLACK) {
                    str += `  Move ${this.turnNum}, `
                    str += result ? 'game over' : 'Black to move'
                } else if (i === 55 && result) {
                    str += '  Result:'
                } else if (i === 71 && result) {
                    str += '  ' + result
                } else if (i === 119 && this.turn === Color.WHITE) {
                    str += `  Move ${this.turnNum}, `
                    str += result ? 'game over' : 'White to move'
                }
                str += `\n`
                i += 8
            }
        }
        str += '  +------------------------+  '
        str += this.game.headers.get('white')?.substring(0, 28) || "White (unknown)"
        str += '\n'
        str += '    a  b  c  d  e  f  g  h'
        return str
    }

    undoMoves (options: MethodOptions.Board.undoMoves = { updatePosCount: true }) {
        if (options.move !== undefined && (options.move < 0 || options.move >= this.history.length)) {
            // Move index is out of bounds
            Log.error(`Could not undo move: Move index is out of bounds (${options.move}).`, SCOPE)
            return false
        }
        if (!this.plyNum) {
            // There is no move to undo
            Log.debug("Cound not undo move: There are no moves made yet.", SCOPE)
            return false
        }
        let moveIndex = this.history.length - 1 // Remove last move by default
        if (options.move !== undefined) {
            moveIndex = options.move
        }
        // If we undo a move in the middle of history, all following moves are removed
        // TODO: Inform user about removal of all following moves
        const removedMoves = this.history.splice(moveIndex)
        this.commitUndoMoves(removedMoves)
        // Correct selected move index if the selected move was undone
        if (this.selectedTurnIndex >= this.history.length) {
            this.selectedTurnIndex = this.history.length - 1
        }
        return removedMoves
    }

    validate (ignoreTurn = false, fixMinor = false) {
        let isValid = true
        const errors = []
        // Count pieces
        const pawnCount = { w: 0, b: 0 }
        const kingCount = { w: 0, b: 0 }
        const officerCount = { w: 0, b: 0 }
        this.squares.forEach((piece) => {
            if (piece === Piece.WHITE_PAWN) {
                pawnCount.w++
            } else if (piece === Piece.BLACK_PAWN) {
                pawnCount.b++
            } else if (piece === Piece.WHITE_KING) {
                kingCount.w++
            } else if (piece === Piece.BLACK_KING) {
                kingCount.b++
            } else if (Piece.WHITE_PROMO_PIECES.indexOf(piece) > -1) {
                officerCount.w++
            } else if (Piece.BLACK_PROMO_PIECES.indexOf(piece) > -1) {
                officerCount.b++
            }
        })
        if (pawnCount.w > 8) {
            isValid = false
            errors.push("White has too many pawns on the board.")
        }
        if (pawnCount.b > 8) {
            isValid = false
            errors.push("Black has too many pawns on the board.")
        }
        if (!kingCount.w || this.kingPos[Color.WHITE] === null ||
            this.squares[this.kingPos[Color.WHITE] as number] !== Piece.WHITE_KING
        ) {
            isValid = false
            errors.push("White is missing or has a misplaced king.")
        }
        if (!kingCount.b || this.kingPos[Color.BLACK] === null ||
            this.squares[this.kingPos[Color.BLACK] as number] !== Piece.BLACK_KING
        ) {
            isValid = false
            errors.push("Black is missing or has a misplaced king.")
        }
        if (kingCount.w > 1) {
            isValid = false
            errors.push("White has too many kings on the board.")
        }
        if (kingCount.b > 1) {
            isValid = false
            errors.push("Black has too many kings on the board.")
        }
        if (pawnCount.w + officerCount.w > 15) {
            isValid = false
            errors.push("White has too many pieces on the board.")
        }
        if (pawnCount.b + officerCount.b > 15) {
            isValid = false
            errors.push("Black has too many pieces on the board.")
        }
        // TODO: Check for bishop colors (ie. all not on same color if 16 pieces on the board)
        if ((this.castlingRights[Color.WHITE].contains(Flags.KSIDE_CASTLING) ||
            this.castlingRights[Color.WHITE].contains(Flags.QSIDE_CASTLING))
            && this.pieceAt('e1') !== Piece.WHITE_KING
        ) {
            if (fixMinor) {
                this.castlingRights[Color.WHITE].clear()
            } else {
                isValid = false
                errors.push("White can't have castling rights if the king has moved.")
            }
        }
        if ((this.castlingRights[Color.BLACK].contains(Flags.KSIDE_CASTLING) ||
            this.castlingRights[Color.BLACK].contains(Flags.QSIDE_CASTLING))
            && this.pieceAt('e8') !== Piece.BLACK_KING
        ) {
            if (fixMinor) {
                this.castlingRights[Color.BLACK].clear()
            } else {
                isValid = false
                errors.push("Black can't have castling rights if the king has moved.")
            }
        }
        if (this.castlingRights[Color.WHITE].contains(Flags.KSIDE_CASTLING)
            && this.pieceAt('h1') !== Piece.WHITE_ROOK
        ) {
            if (fixMinor) {
                this.castlingRights[Color.WHITE].remove(Flags.KSIDE_CASTLING, true)
            } else {
                isValid = false
                errors.push("White can't have king-side castling rights if the rook has moved.")
            }
        }
        if (this.castlingRights[Color.WHITE].contains(Flags.QSIDE_CASTLING)
            && this.pieceAt('a1') !== Piece.WHITE_ROOK
        ) {
            if (fixMinor) {
                this.castlingRights[Color.WHITE].remove(Flags.QSIDE_CASTLING, true)
            } else {
                isValid = false
                errors.push("White can't have queen-side castling rights if the rook has moved.")
            }
        }
        if (this.castlingRights[Color.BLACK].contains(Flags.KSIDE_CASTLING)
            && this.pieceAt('h8') !== Piece.BLACK_ROOK
        ) {
            if (fixMinor) {
                this.castlingRights[Color.BLACK].remove(Flags.KSIDE_CASTLING, true)
            } else {
                isValid = false
                errors.push("Black can't have king-side castling rights if the rook has moved.")
            }
        }
        if (this.castlingRights[Color.BLACK].contains(Flags.QSIDE_CASTLING)
            && this.pieceAt('a8') !== Piece.BLACK_ROOK
        ) {
            if (fixMinor) {
                this.castlingRights[Color.BLACK].remove(Flags.QSIDE_CASTLING, true)
            } else {
                isValid = false
                errors.push("Black can't have queen-side castling rights if the rook has moved.")
            }
        }
        // Check related tests
        if (this.isAttacked(Color.WHITE, this.kingPos[Color.BLACK]) && this.isAttacked(Color.BLACK, this.kingPos[Color.WHITE])) {
            isValid = false
            errors.push("Both kings can't be in check at the same time.")
        }
        if (!ignoreTurn && this.isAttacked(Color.swap(this.turn), this.kingPos[this.turn])) {
            isValid = false
            errors.push("Only the player in turn can have their king in check.")
        }
        return { isValid: isValid, errors: errors }
    }
}
export default Board
