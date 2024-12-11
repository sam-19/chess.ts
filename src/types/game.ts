import { ChessBoard } from "./board"
import { PlayerColor } from "./color"
import { GameHeaders, TerminationReason } from "./headers"
import { ChessMove, MoveError } from "./move"
import { MethodOptions } from "./options"
import { ChessPiece } from "./piece"
import { TimeControlTimers, TCFieldModel, TCTimeValues } from "./timers"
import { ChessTurn } from "./turn"

interface ChessGame {
    // Instance properties
    /** Is this the active game. */
    active: boolean
    /** Game annotator (mapped to the header "Annotator"). */
    annotator: string | null
    /** Currently active board (variation). */
    currentBoard: ChessBoard
    /** Game date in the format YYYY.MM.DD (game time zone, mapped to the header "Date"). */
    date: string | null
    /** ECO designation of the game opening (mapped to the header "ECO"). */
    eco: string | null
    /** End time of the game. */
    endTime: Date | null
    /** Game event (mapped to the header "Event"). */
    event: string | null
    /**
     * FEN description of the starting position (mapped to the header "FEN").
     * 
     * NOTE: FEN description for the current position can be accessed in the Board object (`currentBoard`).
     */
    fen: string | null
    /** PGN headers for the game. */
    headers: GameHeaders
    /**
     * Did the game start from a set-up position (mapped to the header "SetUp").
     * 
     * This property will always return a boolean, but setting it to null will remove the associated header.
     */
    isSetUp: boolean | null
    /** Game mode (mapped to the header "Mode"). */
    mode: string | null
    /**
     * Game pause times as an array of
     * ```
     * [start as Date, end as Date]
     * ```
     */
    pauseTimes: [Date, Date | null][]
    /**
     * Players in this game. Null is used for unavailable properties.
     * ```
     * {
     *  [b|w]: {
     *      elo: number | null
     *      name: string | null
     *      title: string | null
     *      type: string ("human" | "program") | null
     *  }
     * }
     */
    players: {
        b: {
            /** ELO rating of the black player. */
            elo: number | null
            /** Name of the black player. */
            name: string | null
            /** Possible title of the black player. */
            title: string | null
            /** Type of the black player (usually "human" or "program"). */
            type: string | null
        }
        w: {
            /** ELO rating of the white player. */
            elo: number | null
            /** Name of the white player. */
            name: string | null
            /** Possible title of the white player. */
            title: string | null
            /** Type of the white player (usually "human" or "program"). */
            type: string | null
        }
    }
    /**
     * Number of moves played during the game (mapped to the header "PlyCount").
     * 
     * NOTE: Ply count in the current position is stored in the Board object (`currentBoard`).
     */
    plyCount: number | null
    /**
     * Game result (mapped to the header "Result").
     * 
     * NOTE: End result for the current position is stored in the Board object (`endState`).
     */
    result: string | null
    /** Tournament round (mapped to the header "Round"). */
    round: number | null
    /**
     * Should this game be preserved or is it safe to overwrite it?
     * A game should be preserved at least after it has been started and
     * after moves have been made (in analysis mode).
     */
    shouldPreserve: boolean
    /** Game site (mapped to the header "Site"). */
    site: string | null
    /** Start time of the game. */
    startTime: Date | null
    /** Game termination reason (mapped to the header "Termination"). */
    termination: TerminationReason | null
    /** Local game starting time in the format HH:MM:SS (mapped to the header "Time"). */
    time: string | null
    /** Time control used in the game (mapped to the header "TimeControl"). */
    timeControl: string | null
    /** Game timers. */
    timers: TimeControlTimers
    /**
     * Should strict rules (50 move and three-fold repetition) be used
     * when determining draws.
     */
    useStrictRules: boolean
    /** Game date in the format YYYY.MM.DD (mapped to the header "UTCDate"). */
    utcDate: string | null
    /** UTC game starting time in the format HH:MM:SS (mapped to the header "UTCTime"). */
    utcTime: string | null
    /** Different variations (and continuations) in this game. */
    variations: ChessBoard[]

    /*
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
     * Has the game ended either by rules or by resignation/draw agreement.
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


    /*
     * ======================================================================
     *                             METHODS
     * ======================================================================
     */

    /**
     * Add a field to the game's time controls
     * @param tc ChessTimer.FieldModel
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
    getCapturedPieces: (color: PlayerColor, opts?: MethodOptions.Game.getCapturedPieces) => string[] | ChessPiece[]

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
    makeMove: (move: ChessMove, opts?: MethodOptions.Game.makeMove) => ChessTurn | MoveError

    /**
     * Make a move from origination to destination square.
     * @param orig board square (a1...h8)
     * @param dest board square (a1...h8)
     * @param options Options.Board.makeMove
     */
    makeMoveFromAlgebraic: (orig: string, dest: string, options?: MethodOptions.Board.makeMove) => ChessTurn | MoveError

    /**
     * Make move from a SAN string.
     * @param san
     * @param options Options.Board.makeMove
     */
    makeMoveFromSan: (san: string, options?: MethodOptions.Board.makeMove) => ChessTurn | MoveError

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
     * Set the game's time control from a PGN ChessTimer field value.
     * @param tc PGN ChessTimer field value
     */
    setTimeControlFromPgn: (tc: string) => void

    /**
     * Set the function used to report time control progress.
     * @param f report function will return { elapsed: { w, b }, remaining: { w, b } }
     */
    setTimerReportFunction: (f: ((timers: TCTimeValues) => void) | null) => void

    /**
     * Start the game, saving the current timestamp as game start time and starting the clock for white.
     * @return true on success, false on failure
     */
    start: () => boolean

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

    /*
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
     * End state of the root board variation, including:
     * - result code for each player (from `Game.RESULT`)
     * - header for the general result ('*' for games that have not ended yet).
     * 
     * This property only returns the rule-based game ending state; it cannot determine
     * if a game has ended in a draw by mutual agreement, for example.
     */
    endState: {
        result: {
            w: string
            b: string
        }
        header: string
    }
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
     * Which player is to move next.
     */
    playerToMove: PlayerColor
    /**
     * Add given headers to game headers.
     */
    addHeaders: (headers: string[][]) => void
    /**
     * Get a simple list of possible moves in current board state
     * @param opts { notation, onlyDestinations, includeFen, onlyForSquare, filter }
     */
    getMoves: (opts: MethodOptions.Board.getMoves) => {
                        blocked: { move: ChessMove, fen: string, algebraic: string, san: string, uci: string }[],
                        illegal: { move: ChessMove, fen: string, algebraic: string, san: string, uci: string }[],
                        legal: { move: ChessMove, fen: string, algebraic: string, san: string, uci: string }[]
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
    toFen: (options?: MethodOptions.Board.toFen) => string
}

export { ChessGame }
