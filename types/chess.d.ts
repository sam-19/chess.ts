import { ChessBoard } from "./board"
import { PlayerColor } from "./color"
import { FenValidationResult } from "./fen"
import { ChessGame } from "./game"
import { GameHeaders } from "./headers"
import { ChessMove, MoveError } from "./move"
import { MethodOptions } from "./options"
import { ChessPiece } from "./piece"
import { TCFieldModel, TCTimers } from "./time_control"
import { ChessTurn } from "./turn"

/**
 * An object that, in addition to the game itself, contains its
 * location within the loaded game library as a group name
 * and list index within that group. In the case of an undesignated
 * game, the game and index properties will be null.
 */
type GameEntry = { game: ChessGame | null, group: string, index: number }

interface ChessCore {
    /**
     * Currently active group
     * @param group group identifier
     */
    activeGame: ChessGame | null
    /**
     * Currently active group
     * @param group group identifier
     */
    activeGroup :string
    /**
     * List of groups and contained games.
     */
    games: { [group: string]: ChessGame[] }
    /**
    * Add a game to loaded games.
    * @param game the game to add
    * @param group optional group to add the game into (defaults to currently active group)
    * @returns ```
    * // The newly added game, its group and index within the group
    * return { game: Game, group: string, index: number }
    * ```
    */
    addGame: (game: ChessGame, group?: string) => GameEntry
    /**
     * Clear all games from the given group
     * @param group defaults to currently active group
     */
    clearAllGames: (group?: string) => void
    /**
     * Parser for single PGN game entries, already divided into { headers, moves }
     * @param pgn { headers, moves }
     * @param group the group to assign this game to
     * @return Game
     */
    createGameFromPgn: (pgn: { headers: string[][], moves: string }, group?: string) => GameEntry
    /**
     * Load a game that has already been parsed from PGN
     * @param index index of the parsed game in group list
     * @param group defaults to currently active group
     * @return ```
     * // The newly added game, its group and index within the group
     * return { game: Game, group: string, index: number }
     * // Or null, if such a parsed game cannot be found
     * return null
     * ```
     */
    loadParsedGame: (index: number, group?: string) => GameEntry | null
    /**
     * Load a small number of games from a PGN collection or return header information
     * @param pgn PGN game collection
     * @param group Group the game is in: (defaults to currently active group)
     * @param opts ```
     * Object<{
     *     maxItems: number: (int),       // maximum number of games to load: (default 10), will parse only header information beyond this
     *     loadFirst: boolean,           // automatically load the first game: (default true)
     *     returnHeaders:: () => string,  // return headers using this function, otherwise return them when function finishes
     *     resetGames: boolean,          // reset currently cached games: (default true) or append newly parsed games to the list
     * }>
     * ```
     * @return gameHeaders
     */
    loadPgn: (pgn: string, group?: string, opts?: MethodOptions.Chess.loadPgn) => string[][][]
    /**
     * Load game(s) from a PGN collection
     * @param pgn - PGN string
     * @param group - Group the game is in: (defaults to currently active group)
     * @param opts - ```
     * Object<{
     *    batchSize: number                     // batch size of games to load in one continuous loop: (progress is reported between batches, default 10)
     *    maxAmount: number                     // of games to load into memory: (default 100)
     *    reportProgress:: (progress: number[])  // will use this function return the progress of on loading the games as [loaded, total]: (default null)
     *    startFrom: number                     // index to start loading games from: (default 0)
     * }>
     * ```
     * @param reset Reset the current PGN cache: (default true)
     */
    loadPgnInBatches: (pgn: string, group?: string, opts?: MethodOptions.Chess.loadPgnInBatches, reset?: boolean) => void
    /**
     * Create a new game from given FEN
     * @param fen
     * @param group The group the game is created in: (defaults to currently active group)
     * @param replace Force replace the currently selected game: (default false)
     * @return newly added game position { group, index }
     */
    newGame: (fen?: string, group?: string, replace?: boolean) => GameEntry
    /**
     * Parse a PGN file containing one or more game records
     * @param pgn
     * @return array containing games parsed to headers and moves [{ headers, moves }]
     */
    parseFullPgn: (pgn: string) => { headers: string[][], moves: string }[]
    /**
     * Remove the game at index from given group.
     * Arguments have individual defaults, so either override both or neither!
     * @param group defaults to currently active group
     * @param index defaults to currently active game
     */
    removeGame: (group?: string, index?: number) => void
    /**
     * Reset the game in group at index to default: (starting) state.
     * Arguments have individual defaults, so either override both or neither!
     * @param group defaults to currently active group
     * @param index defaults to currently active game
     */
    resetGame: (group?: string, index?: number) => void/**
    * Select the game at the given `index` as the active game.
    * @param index - Index of the game within the group.
    * @param group - Group of the game (defaults to currently active group).
    * @returns The selected Game or null if it doesn't exist.
    */
   selectGame: (index: number, group?: string) => ChessGame | null
    /**
     * Unset active game, but keep the group
     */
    unsetActiveGame: () => void

    /* ==================================
    Pass-throughs
    ================================== */

    /**
     * Does the game break the 50 move rule.
     */
    breaks50MoveRule: boolean
    /**
     * Does the game break the 75 move rule.
     */
    breaks75MoveRule: boolean
    /**
     * Move variations for currently selected turn.
     * NOTE: This ALWAYS includes the base move in the list of variations, so index of a variation
     * on the array returned by this method is not equal to its index in the board's variation list.
     */
    currentMoveVariations: { move: ChessMove, continuation: boolean }[]
    /**
     * Dues the game have an end result.
     */
    endResult: null | {
        result: {
            w: string
            b: string
        }
        headers: string
    }
    /**
     * Has the game ended.
     */
    hasEnded: boolean
    /**
     * Has the game started.
     */
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
     * Has the game started.
     */
    hasStarted: boolean
    /**
     * Current game headers.
     */
    headers: GameHeaders | undefined
    /**
     * Is the game finished (by checkmate or stalemate).
     */
    isFinished: boolean
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
     * Is the game is paused.
     */
    isPaused: boolean
    /**
     * Which player is to move next.
     */
    playerToMove: PlayerColor
    /**
     * Current board's turn index position as [index, historyLength].
     */
    turnIndexPosition: number[]
    /**
     * Add given headers to game headers.
     */
    addHeaders: (headers: string[][]) => void
    /**
     * Current board's turn index position as [index, historyLength].
     */
    loadFen: (fen: string) => void
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
     * Get a simple list of possible moves in current board state
     * @param opts { notation, onlyDestinations, includeFen, onlyForSquare, filter }
     */
    getMoves: (opts: MethodOptions.Board.getMoves) => {
                        blocked: { move: string, fen: string, algebraic: string, san: string, uci: string }[],
                        illegal: { move: string, fen: string, algebraic: string, san: string, uci: string }[],
                        legal: { move: string, fen: string, algebraic: string, san: string, uci: string }[]
                    }
    /**
     * Go to the start of the game (before the first move).
     */
    goToStart: () => void
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
     * Select the next turn in turn history
     * @return true on success, false on failure
     */
    nextTurn: () => boolean
    /**
     * Pause the currently active game.
     */
    pause: () => void
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
     * @param boardIdx index of the target board (optional, current board by default)
     * @return true on success, false on failure
     */
    selectTurn: (index: number, boardIdx?: number) => boolean
    /**
     * Set the game's time control from a PGN TimeControl field value.
     * @param tc PGN TimeControl field value
     */
    setTimeControlFromPgn: (tc: string) => void
    /**
     * Set the function used to report time control progress.
     * @param f report function will return { elapsed: { w, b }, remaining: { w, b } }
     */
    setTimeControlReportFunction: (f: ((timers: TCTimers) => void) | null) => void
    /**
     * Start the game, saving the current timestamp as game start time and starting the clock for white.
     * @return true on success, false on failure
     */
    start: () => boolean
    /**
     * Get the FEN representation of this game.
     */
    toFen: (options?: MethodOptions.Board.toFen) => string
    /**
     * Get the PGN representation of the game.
     * @param options MethodOptions.Game.toPgn
     */
    toPgn: (options?: MethodOptions.Game.toPgn) => string
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
     * Validate the given FEN string
     * @param fen FEN to validate
     * @param onlyPosition only validate the position, not game state
     * @param rules which rules to use in validation (defaults to traditional rules)
     */
    validateFen: (fen: string, onlyPosition?: boolean, rules?: string) => FenValidationResult
    // Auxiliary methods
}

export { ChessCore, GameEntry }
