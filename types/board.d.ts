import { ChessGame } from "./game"
import { ChessMove, MoveError } from "./move"
import { ChessPiece } from "./piece"
import { ChessTurn } from "./turn"
import { MoveFlags } from "./flags"
import { PlayerColor } from "./color"
import { MethodOptions } from "./options"

interface ChessBoard {
    //////       INSTANCE PROPERTIES       //////
    /** Which castling rights each player has left */
    castlingRights: { [color: string]: MoveFlags }
    /** Is this a continuation of the parent move */
    continuation: boolean
    /** Possible square eligible for en pasant capture */
    enPassantSqr: number | null
    /** Parent game */
    game: ChessGame
    /** How many half moves since last capture or pawn move, for 50/75 move rule */
    halfMoveCount: number
    /** Turn history on this board */
    history: ChessTurn[]
    /** Unique board id in the parent game context */
    id: number
    /** Is this a mock board. */
    isMock: boolean
    /**
     * Current king position for each player (as a 0x88 board index).
     * King position can be null in analysis mode (before kings are set on the board).
     * @remarks
     * King position is so fundamental in chess that it is worth the effort to keep
     * track of it separately instead of looking it up every time it's needed.
     */
    kingPos: { [color: string]: number | null }
    /** A board template to use for calculating resulting board states after alternative moves. */
    mockBoard: ChessBoard | null
    /** Cached moves for this turn (so they don't have to be calculated multiple times) */
    moveCache: {
        includeFen: boolean,
        includeSan: boolean,
        moves: ChessMove[]
    }
    /** Possible parent board that this is a variation/continuation of */
    parentBoard: ChessBoard | null
    /** Index of the turn where this board branched off */
    parentBranchTurnIndex: number | null
    /** Ply number (completed half moves since start of the game) */
    plyNum: number
    /** Count of each unique FEN position in this board's history, for three-/five-fold repetition rule */
    posCount: Map<string, number>
    /** Index of the selected turn */
    selectedTurnIndex: number
    /** List of board square contents */
    squares: ChessPiece[]
    /** Player in turn */
    turn: PlayerColor
    /** Turn number or full move number (starting from 1, for PGN game log) */
    turnNum: number
    /**
     * ======================================================================
     *                             GETTERS
     * ======================================================================
     */

    /**
     * Check if the game on this board breaks the 50 move rule.
     */
    breaks50MoveRule: boolean

    /**
     *  Check if the game on this board breaks the 75 move rule (arbiter rule).
     */
    breaks75MoveRule: boolean

    /**
     * Check if the board has insufficient material for checkmate.
     */
    hasInsufficientMaterial: boolean

    /**
     * Check if any position has repeated five times on this board (arbiter rule).
     */
    hasRepeatedFivefold: boolean

    /**
     * Check if any position has repeated three times on this board.
     */
    hasRepeatedThreefold: boolean

    /**
     * Is the game on this board a draw.
     */
    isDraw: boolean

    /**
     * Check if game on this board is finished.
     * Uses the parent game's strickt rule check to determine whether to check for
     * 50-move or 75-move rules and three-fold or five-fold repetition rules.
     */
    isFinished: false | {
        result: {
            w: string
            b: string
        }
        headers: string
    }

    /**
     * Is the player to move in check.
     */
    isInCheck: boolean

    /**
     * Is the player to move in checkmate.
     */
    isInCheckmate: boolean

    /**
     * Is the player to move in stale mate.
     */
    isInStalemate: boolean

    /**
     * Currently selected turn.
     */
    selectedTurn: ChessTurn

    /**
     * Currently selected turn index position in turn history as [index, historyLength].
     */
    turnIndexPosition: number[]

    /**
     * ======================================================================
     *                             METHODS
     * ======================================================================
     */

    /**
     * Commit a move, handling captures, promotions and other special cases, essentially updating the
     * board state to match the move. This method can also be called to "remake" a move from the history.
     * @param move
     * @param updatePosCount count the following position towards position repetitions
     *                                 in threefold and fivefold peretition rules (default true)
     * @return the piece removed from destination square (Piece.NONE if not a capture)
     */
    commitMove: (move: ChessMove, updatePosCount: boolean) => ChessPiece

    /**
     * Commit undoing moves, handling captures, promotions and other special cases, updating the
     * board state to reflect these changes. This method can be called to traverse back in turn
     * history without actually altering it.
     * @param moves
     */
    commitUndoMoves: (moves: ChessTurn[]) => void

    /**
     * Get a disambiguating prefix for a SAN move, if it needs one
     * @param move
     * @return prefix, '' if none is needed
     */
    disambiguateMove: (move: ChessMove) => string

    /**
     * Generate a list of possible moves in current board position
     * @param options { onlyForSquare, includeSan, includeFen, onlyLegal }
     */
    generateMoves: (opts: MethodOptions.Board.generateMoves) => ChessMove[]

    /**
     * Get a simple list of possible moves in current board state
     * @param opts { notation, onlyDestinations, includeFen, onlyForSquare, filter }
     */
    getMoves: (opts: MethodOptions.Board.getMoves) => {
                        blocked: { move: string, fen: string, algebraic: string, san: string, uci: string }[],
                        illegal: { move: string, fen: string, algebraic: string, san: string, uci: string }[],
                        legal: { move: string, fen: string, algebraic: string, san: string, uci: string }[]
                    }

    /**
     * Check if pieces of given color are attacking a square.
     * This can be used to check for pieces defending a square, by passing in the defender color.
     * @param attacker
     * @param square 0x88 index of the target square
     * @param detailed return detailed information about the attackers (default false)
     * @return true/false if not detailed, array of attacking piece square indices if detailed
     */
    isAttacked: (attacker: PlayerColor, square: number | null, detailed: boolean) => boolean | number[]

    /**
     * Check if the proposed move is a new move or already the next move in history (that is, either
     * the next move itself, a continuation of current move, or a variation of the next move).
     * @param move
     * @return
     * ```
     * {
     *      isNew (boolean),
     *      contIdx (number, -1 if not a continuation),
     *      varIdx (number, -1 if not a variation)
     * }
     * ```
     */
    isNewMove: (move: ChessMove) => { isNew: boolean, contIdx: number, varIdx: number }

    /**
     * Load board state from given FEN, overwriting current state
     * @param fen FEN string
     * @return true on success, false on failure
     */
    loadFen: (fen: string) => boolean

    /**
     * Make a mock move on that doesn't affect current board state, returning the mock board state after the move
     * @param move the move to make
     * @param reset reset the mock board state to match current board state before making the move (default true)
     * @return mock board state
     */
    makeMockMove: (move: ChessMove, reset?: boolean) => ChessBoard

    /**
     * Make a new move on the board
     * @param move the move to make
     * @param options Options.Board.makeMove
     */
    makeMove: (move: ChessMove, opts: MethodOptions.Board.makeMove) => ChessTurn | MoveError

    /**
     * Make a move from algebraic square names
     * @param orig square name (a1...h8)
     * @param dest square name (a1...h8)
     * @param options Options.Board.makeMove
     * @return Move on success, { error } on failure
     */
    makeMoveFromAlgebraic: (orig: string, dest: string, options: MethodOptions.Board.makeMove) => ChessTurn | MoveError

    /**
     * Make a move from a SAN string
     * @param san a DISAMBIGUOUS SAN string
     * @param options Options.Board.makeMove
     * @return Move on success, { error } on failure
     */
    makeMoveFromSAN: (san: string, options: MethodOptions.Board.makeMove) => ChessTurn | MoveError

    /**
     * Select the next turn in turn history
     * @return true on success, false on failure
     */
    nextTurn: () => boolean

    /**
     * Get the piece occupying the given square.
     * @param square 0x88 square index or square name (a1, a1,... h7, h8)
     * @return piece at square
     */
    pieceAt: (square: number | string) => ChessPiece

    /**
     * Place a piece on the given square.
     * @param piece
     * @param square 0x88 square index
     */
    placePiece: (piece: ChessPiece, square: number | string) => false | ChessPiece

    /**
     * Select the previous turn in turn history
     * @return true on success, false on failure
     */
    prevTurn: () => boolean

    /**
     * Remove the piece occupying given square; returns removed piece
     * @param square 0x88 square index or sqwuare name
     * @return removed piece, false on error
     */
    removePiece: (square: number | string) => false | ChessPiece

    /**
     * Reset the move cache object.
     */
    resetMoveCache: () => void

    /**
     * Select the turn at given index in turn history
     * @param index
     * @return true on success, false on failure
     */
    selectTurn: (index: number) => boolean

    /**
     * Get a FEN string representing current board state
     * @param options MethodOptions.Board.toFen
     */
    toFen: (opts: MethodOptions.Board.toFen) => string

    /**
     * Generate an ASCII representation of the game board
     */
    toString: () => string

    /**
     * Undo a move or all moves until the given move index, permanently removing them from the turn history.
     * @param options MethodOptions.Board.undoMoves
     * @return remove Turns or false if failure
     */
    undoMoves: (options: MethodOptions.Board.undoMoves) => ChessTurn[] | false

    /**
     * Validate this board state, checking for possible errors.
     * @param ignoreTurn Ignore turn based checks (default false)
     * @param fixMinor Fix minor issues like castling rights (default false)
     */
    validate: (ignoreTurn: boolean, fixMinor: boolean) => { isValid: boolean, errors: string[] }
}
export { ChessBoard }
