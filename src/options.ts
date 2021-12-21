import { ChessOptions, MethodOptions } from '../types/options'

class Options implements ChessOptions {
    // Static properties
    /*
        DEFAULT OPTIONS
    */
    ///// BOARD //////
    static readonly Board = {
        /**
         * Default options for branching a new board from a parent board state
         * @param continuation is this a continuation (default false) or a basic variation
         */
        branchFromParent: () => new Options({
            continuation: false
        } as MethodOptions.Board.branchFromParent),
        /**
         * Default options for move generator
         * @param includeFen include a FEN representation of the board state resulting from the move (default false)
         * @param inludeSan include a SAN reporesentations for the generated moves (default false)
         * @param onlyForSquare only generate moves for the piece on given square (default null)
         * @param onlyLegal only return legal moves (default true)
         * @param skipCkeckmate do not check for checkmate (can cause an infinite loop)
         */
        generateMoves: () => new Options({
            includeFen: false,
            includeSan: false,
            onlyForSquare: undefined,
            onlyLegal: true,
            skipCheckmate: false,
        }),
        /**
         * Default options for move getter
         * @param notation which notations to include (all|algebraic|san|uci, default all)
         * @param filter filter out moves that don't match the filter (null|legal|illegal|blocked, default null) TODO: A better name for this, all of these parameters are filters after all
         * @param includeFen include a FEN representation of the board state resulting from the move (default false)
         * @param onlyDestinations only return the destination squares (ignored if onlyForSquare is false, default false
         * @param onlyForSquare only generate moves for the piece on given square (default null)
         */
        getMoves: () => new Options({
            notation: 'all',
            filter: undefined,
            includeFen: false,
            onlyDestinations: false,
            onlyForSquare: undefined,
        }),
        /**
         * Default options for move maker
         * @param comment comment to add as an annotation to the move
         * @param isPlayerMove is this a move made by the player (default true)
         * @param moveTime the game clock time (in seconds) when this move was made
         * @param moveTimeDelta the amount of game time elapsed since previous move (in seconds)
         * @param preserveGame should the game be preserved after this move has been made (default true)
         * @param puzzleSolution is this move an attempted puzzle solution (default false)
         * @param takeback is this a takeback move (default false)
         * @param updatePosCount should the board state resulting from this move count towards unique board configurations (see repetition rules, default true)
         */
        makeMove: () => new Options({
            comment: undefined,
            isPlayerMove: true,
            moveTime: 0,
            moveTimeDelta: 0,
            preserveGame: true,
            puzzleSolution: false,
            takeback: false,
            updatePosCount: true
        } as MethodOptions.Board.makeMove),
        /**
         * Default options for FEN generator
         * @param meta include meta information in the FEN string (default true); otherwise return only the board position
         */
        toFen: () => new Options({
            meta: true
        }),
    }
    static readonly Chess = {
        /**
         * Default options for PGN loader
         * @param maxItems - maximum items to load from the file (default 10)
         * @param activateFirst - should the first item be automatically activated (default true)
         * @param returnHeaders - function that takes loaded game headers as an argument (default null)
         * @param resetGames - should currently loaded games be reset or new games appended to them (default true)
         */
        loadPgn: () => new Options({
            maxItems: 10,
            activateFirst: true,
            returnHeaders: undefined,
            resetGames: true,
        } as MethodOptions.Chess.loadPgn),
        /**
         * Default options for PGN batch loader
         * @param batchSize how many games to load in a batch (progress is reported between batches, default 10)
         * @param maxAmount maximum amount of games to load in total (default 100)
         * @param reportProgress function that takes current loading progress [loaded, total] as an argument (default null)
         * @param startFrom start from the game at the given index (default 0)
         */
        loadPgnInBatches: () => new Options({
            batchSize: 10,
            maxAmount: 100,
            reportProgress: undefined,
            startFrom: 0,
        } as MethodOptions.Chess.loadPgnInBatches)
    }
    static readonly Game = {
        getCapturedPieces: () => new Options({
            onlyType: false,
        } as MethodOptions.Game.getCapturedPieces),
        /**
         * Default options for move maker
         * @param branchVariation new variations will be branched off the main line (false means new variations will become the main line)
         * @param comment comment to add as an annotation to the move
         * @param isPlayerMove is this a move made by the player (default true)
         * @param moveTime the game clock time (in seconds) when this move was made
         * @param moveTimeDelta the amount of game time elapsed since previous move (in seconds)
         * @param preserveGame should the game be preserved after this move has been made (default true)
         * @param puzzleSolution is this move an attempted puzzle solution (default false)
         * @param takeback is this a takeback move (default false)
         * @param updatePosCount should the board state resulting from this move count towards unique board configurations (see repetition rules, default true)
         */
        makeMove: () => new Options({
            branchVariation: true,
            comment: undefined,
            isPlayerMove: true,
            moveTime: 0,
            moveTimeDelta: 0,
            preserveGame: true,
            puzzleSolution: false,
            takeback: false,
            updatePosCount: true
        } as MethodOptions.Game.makeMove),
        /**
         * Default options for PGN generator
         * @param lengthMeasure how to measure the maximum line length rule (width|moves, default width)
         * @param maxLength maximum line length units (in characters for width measure, move count for moves measure, default 60)
         * @param newLine new line character (default Unix new line \n)
         * @param showMoveCursor print the location of the move cursor if a move in the history is selected (default false)
         * @param wrapMoves allow wrapping to new line inside moves (ignored if lengthMeasure is moves, default true)
         */
        toPgn: () => new Options({
            lengthMeasure: 'width',
            maxLength: 60,
            newLine: '\n',
            showHeaders: true,
            showMoveCursor: false,
            wrapMoves: true
        } as MethodOptions.Game.toPgn),
    }
    ///// MOVE /////
    static readonly Move = {
        /**
         * Allow parsing overly diambiguated SAN strings into moves
         */
        sloppySAN: true,
    }
    ///// TIME CONTROL /////
    static readonly TimeControl = {
        /**
         * Automatically lose to timeout when the timer reaches zero
         */
        autoTimeout: false,
    }
    // Instance properties
    protected _initial: any

    constructor (params: any) {
        // Save initial options
        this._initial = {...params}
        this.assign(params)
    }
    /**
     * Assign new values to a set of options.
     * @param params new options as { [key: string]: value }
     * @returns updated options
     */
    assign (params: any) {
        let keys = Object.keys(params)
        for (const k of keys) {
            (this as any)[k] = params[k]
        }
        return this
    }
    /**
     * Get default option values.
     * @returns Options with default values
     */
    defaults () {
        return new Options({})
    }
    /**
     * Get initial option values.
     * @returns default options
     */
    initial () {
        return new Options(this._initial)
    }
}

export default Options
