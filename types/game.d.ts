import { ChessBoard } from "./board"
import { PlayerColor } from "./color"
import { GameHeaders } from "./headers"
import { ChessMove, MoveError } from "./move"
import { MethodOptions } from "./options"
import { ChessPiece } from "./piece"
import { ChessTimeControl, TCFieldModel } from "./time_control"
import { ChessTurn } from "./turn"

interface ChessGame {
    // Instance properties
    active: boolean
    currentBoard: ChessBoard
    endTime: Date | null
    headers: GameHeaders
    /**
     * Game pause times as an array of
     * ```
     * [start as Date, end as Date]
     * ```
     */
    pauseTimes: [Date, Date | null][]
    result: {
        w: string,
        b: string,
    }
    /**
     * Should this game be preserved or is it safe to overwrite it?
     * A game should be preserved at least after it has been started and
     * after moves have been made (in analysis mode).
     */
    shouldPreserve: boolean
    startTime: Date | null
    timeControl: ChessTimeControl
    /**
     * Should strict rules (50 move and three-fold repetition) be used
     * when determining draws.
     */
    useStrictRules: boolean
    /** Different variations (and continuations) in this game. */
    variations: ChessBoard[]

    /**
     * ======================================================================
     *                             GETTERS
     * ======================================================================
     */

    /**
     * Move variations for currently selected turn.
     * NOTE: This ALWAYS includes the base move in the list of variations, so index of a variation
     * on the array returned by this method is not equal to its index in the board's variation list.
     */
    currentMoveVariations: { move: ChessMove, continuation: boolean }[]

    /**
     * Has the game ended.
     */
    hasEnded: boolean

    /**
     * Has the game started.
     */
    hasStarted: boolean

    /**
     * Is the game is paused.
     */
    isPaused: boolean

    /**
     * Current board's turn index position as [index, historyLength].
     */
    turnIndexPosition: number[]


    /**
     * ======================================================================
     *                             METHODS
     * ======================================================================
     */

    /**
     * Add a field to the game's time controls
     * @param tc TimeControl.FieldModel
     */
    addTimeControl: (tc: TCFieldModel) => void

    /**
     * Continue the currently paused game.
     */
    continue: () => void

    /**
     * Alias for createVariationFromSAN(continuation = true).
     */
    createContinuationFromSan: (san: string) => boolean

    /**
     * Create a new variation for currently selected move from given SAN.
     * @param san
     * @param continuation is this a continuation (default false = variation)
     * @return true on success, false on failure
     */
    createVariationFromSan: (san: string, continuation?: boolean) => boolean

    /**
     * End the current game.
     * @param result '1-0' | '0-1' | '1/2-1/2' (default '1/2-1/2')
     */
    end: (result?: string) => void

    /**
     * Enter one of this move's alternate continuations, making the first move of the continuation.
     * @param i continuation's index in the list of this move's variations (optional, default 0)
     * @return the first move of the continuation or false (in case of error)
     */
    enterContinuation: (i?: number) => boolean

    /**
     * Enter one of this move's alternate variations, making the first move of the variation.
     * @param i variation's index in the list of selected move's variations (optional, default 0)
     * @return the first move of the continuation or false (in case of error)
     */
    enterVariation: (i?: number) => boolean

    /**
     * Return a list of captured pieces for given color.
     * @param color PlayerColor
     * @param opts MethodOptions.Game.getCapturedPieces
     */
    getCapturedPieces: (color: PlayerColor, opts: MethodOptions.Game.getCapturedPieces) => string[] | ChessPiece[]

    /**
     * Return the list of moves (from game start to currently selected move) in currently active line,
     * returning either Move objects or filtered property.
     * @param filter 'id', 'san', or undefined
     * @return
     */
    getMoveHistory: (filter?: string) => (string | ChessTurn)[]

    /**
     * Go to the start of the game (before the first move).
     */
    goToStart: () => void

    /**
     * Load a new game from a FEN string, overwriting a possible previous game.
     * @param fen
     */
    loadFen: (fen: string) => void

    /**
     * Make a move from Move object.
     * @param move
     * @param options Options.Board.makeMove
     */
    makeMove: (move: ChessMove, opts: MethodOptions.Game.makeMove) => ChessTurn | MoveError

    /**
     * Make a move from origination to destination square.
     * @param orig board square (a1...h8)
     * @param dest board square (a1...h8)
     * @param options Options.Board.makeMove
     */
    makeMoveFromAlgebraic: (orig: string, dest: string, options: MethodOptions.Board.makeMove) => ChessTurn | MoveError

    /**
     * Make move from a SAN string.
     * @param san
     * @param options Options.Board.makeMove
     */
    makeMoveFromSan: (san: string, options: MethodOptions.Board.makeMove) => ChessTurn | MoveError

    /**
     * Move the rest of the current board's turn history to a new continuation of the current move.
     * @return true on success, false if there is no history to move
     */
    moveHistoryToNewContinuation: () => boolean

    /**
     * Move the rest of the current board's turn history to a new variation.
     * @param newTurn the new next turn (optional) -
     *                if passed, the old history will be automatically added as a variation to this turn
     * @return old turn history as Board or false if there is no history to move
     */
    moveHistoryToNewVariation: (newTurn?: ChessTurn) => ChessBoard | false

    /**
     * Pause the currently active game.
     */
    pause: () => void

    /**
     * Return from current continuation, activating the parent variation.
     * @return true on success, false on failure
     */
    returnFromContinuation: () => boolean

    /**
     * Return from current variation, activating the parent variation.
     * @return true on success, false on failure
     */
    returnFromVariation: () => boolean

    /**
     * Select a turn from history, adjusting current board state and returning the selected move.
     * @param index turn index within the target board's turn history
     * @param boardVar id of the target board (optional, current board by default)
     * @return true on success, false on failure
     */
    selectTurn: (index: number, boardVar?: number) => boolean

    /**
     * Set the game's time control from a PGN TimeControl field value.
     * @param tc PGN TimeControl field value
     */
    setTimeControlFromPGN: (tc: string) => void

    /**
     * Set the function used to report time control progress.
     * @param f report function will return { elapsed: { w, b }, remaining: { w, b } }
     */
    setTimeControlReportFunction: (f: any) => void

    /**
     * Start the game, saving the current timestamp as game start time and starting the clock for white.
     * @return true on success, false on failure
     */
    start: () => boolean

    /**
     * Get the PGN representation of the game.
     * @param options MethodOptions.Game.toPgn
     */
    toPgn: (options: MethodOptions.Game.toPgn) => string

    /**
     * Update game setup header to match the starting state. Only usable before the game has started!
     */
    updateSetup: () => void

    /**
     * Generate a string representation of the game state.
     * @return moves, meta and ASCII monospace reprensetation of the current board position
     */
    toString: () => string

    /**
     * ======================================================================
     *                          PASS-THROUGHS
     * ======================================================================
     */

    /**
     * Does the game break the 50 move rule.
     */
    breaks50MoveRule: boolean
    /**
     * Does the game break the 75 move rule.
     */
    breaks75MoveRule: boolean
    /**
     * Does this game have insufficient material for checkmate.
     */
    hasInsufficientMaterial: boolean
    /**
     * Has any position has repeated five times in this game (arbiter rule).
     */
    hasRepeatedThreefold: boolean
    /**
     * Has any position has repeated five times in this game.
     */
    hasRepeatedFivefold: boolean
    /**
     * Is the game finished (by checkmate or stalemate).
     */
    isFinished: false | {
        result: {
            w: string
            b: string
        }
        headers: string
    }
    /**
     * Is the game in check.
     */
    isInCheck: boolean
    /**
     * Is the game in checkmate.
     */
    isInCheckmate: boolean
    /**
     * Is the game a draw.
     */
    isDraw: boolean
    /**
     * Is the game in stalemate.
     */
    isInStalemate: boolean
    /**
     * Add given headers to game headers.
     */
    addHeaders: (headers: string[][]) => void
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
     * Go to previous turn in history, returning to parent variation if necessary.
     * @return true on success, false on failure
     */
    prevTurn: () => boolean
    /**
     * Remove the piece at give square.
     * @param square 0x88 square index or sqwuare name
     * @return Removed Piece or false on error
     */
    removePiece: (square: number | string) => false | ChessPiece
    /**
     * Get the FEN representation of this game.
     */
    toFen: (options: MethodOptions.Board.toFen) => string
    /**
     * Return the color whose turn it is to move
     * @return Color.WHITE or Color.BLACK
     */
    whoIsToMove: () => PlayerColor
}

export { ChessGame }
