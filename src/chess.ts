/* Refactored chess.js module
   Based on aaronfi's work https://github.com/aaronfi/chess-es6.js
*/

import Annotation from './annotation'
import Board from './board'
import Color from './color'
import Fen from './fen'
import Flags from './flags'
import Game from './game'
import { Log } from 'scoped-event-log'
import Move from './move'
import Nag from './nag'
import Options from './options'
import Piece from './piece'
import ChessTimer from './timers'
import Turn from './turn'

import { ChessCore, GameEntry } from './types/chess'
import { MethodOptions } from './types/options'
import { PlayerColor } from './types/color'
import { MoveError } from './types/move'
import { TCTimeValues } from './types/timers'
import { AnyHeader } from './types/headers'
import { BoardSquareIndex, BoardSquareName } from './types/board'

const SCOPE = 'chess'

export default class Chess implements ChessCore {
    // Static properties
    static readonly RESULT = Game.RESULT
    // Subclasses
    static readonly Board = Board
    static readonly Color = Color
    static readonly Fen = Fen
    static readonly Flags = Flags
    static readonly Game = Game
    static readonly Log = Log
    static readonly Move = Move
    static readonly Nag = Nag
    static readonly Piece = Piece
    static readonly ChessTimer = ChessTimer

    // Instance properties
    active: GameEntry
    games: { [group: string]: Game[] }
    lastActive: { [group: string]: number }
    lastRemoved: GameEntry | null
    parsedPgnGames: { [group: string]: { headers: [AnyHeader, string][], moves: string }[] }

    // Default starting FEN
    constructor () {
        // Initialize the game
        this.active = { game: null, group: 'default', index: -1 }
        this.games = {}
        this.lastActive = { default: -1 }
        this.lastRemoved = null // Enable undoing a remove
        this.parsedPgnGames = { default: [] }
    }

    /*
     * ======================================================================
     *                             GETTERS
     * ======================================================================
     */

    /**
     * Currently active game (read-only).
     */
    get activeGame () {
        return this.active.game
    }

    /*
     * ======================================================================
     *                             SETTERS
     * ======================================================================
     */

    /**
     * Set currently active group.
     * @param group group identifier
     */
    set activeGroup (group: string) {
        if (group === this.active.group) {
            return
        }
        // Check that group exists
        if (!Object.prototype.hasOwnProperty.call(this.games, group)) {
            this.games[group] = []
        }
        this.active.group = group
        if (!this.games[group].length) {
            this.active.index = -1
            this.active.game = null
        } else if (this.lastActive[group] !== null) {
            // Recover last active game
            this.active.index = this.lastActive[group]
            this.active.game = this.active.index !== null
                               ? this.games[group][this.active.index]
                               : null
        } else {
            // Default to first game in group
            this.active.index = 0
            this.active.game = this.games[group][0] || null
        }
    }

    /**
     * Set the index of the active game within currently active group.
     */
    set activeIndex (index: number) {
        this.selectGame(index)
    }

    /*
     * ======================================================================
     *                             METHODS
     * ======================================================================
     */

    /**
     * Add a game to loaded games.
     * @param game the game to add
     * @param group optional group to add the game into (defaults to currently active group)
     * @return ```
     * // The newly added game, its group and index within the group
     * return { game: Game, group: string, index: number }
     * ```
     */
    addGame (game: Game, group=this.active.group) {
        if (!Object.prototype.hasOwnProperty.call(this.games, group)) {
            this.games[group] = [] // Create group if it doesn't exist
        }
        this.games[group].push(game)
        const newEntry = { game: game, group: group, index: this.games[group].length - 1 }
        if (this.active.group === group && this.active.game === null) {
            this.active = newEntry
        }
        return newEntry
    }

    /**
     * Clear all games from the given group
     * @param group defaults to currently active group
     */
    clearAllGames (group=this.active.group) {
        this.games[group] = [] // Creates group if it doesn't exist
        if (this.active.group === group) {
            this.lastActive[group] = -1
            this.active = { game: null, group: 'default', index: -1 }
        }
    }

    /**
     * Parser for single PGN game entries, already divided into { headers, moves }
     * @param pgn { headers, moves }
     * @param group defaults to currently active group
     * @return ```
     * // The newly added game, its group and index within the group
     * return { game: Game, group: string, index: number }
     * ```
     */
    createGameFromParsed (pgn: { headers: [AnyHeader, string][], moves: string }, group=this.active.group) {
        // I found aaronfi's approach to this much more convenient than the original chess.js method
        const VALID_RESULTS = ['1-0', '1/2-1/2', '0-1', '0-0', '*', '+/-', '-/+', '-/-']
        let fen = Fen.DEFAULT_STARTING_STATE
        // Get possible setup FEN from headers
        for (let i=0; i<pgn.headers.length; i++) {
            if (pgn.headers[i][0].toUpperCase() === 'FEN') {
                fen = pgn.headers[i][1]
            }
        }
        // Create a game with PGN data
        const game = new Game(fen, pgn.headers)
        // Includes variation support after aaronfi's original work
        const openVariation = (continuation: boolean) => {
            // Create a new variation
            const newBoard = Board.branchFromParent(game.currentBoard, { continuation: continuation })
            // Attach the new variation to its starting move index
            game.currentBoard.history[game.currentBoard.history.length-1].variations.push(newBoard)
            // Set the new variation as current one
            game.currentBoard = newBoard
        }
        // Close this variation and return to the next one up in hierarchy
        const closeVariation = () => {
            game.currentBoard = game.currentBoard.parentBoard as Board
        }
        // Parse moves from PGN data
        let end = 0
        // Flag moves as procedurally generated and that game should not be preserved for them
        const moveOpts = { isPlayerMove: false, preserveGame: false }
        let lastMove: Turn | MoveError | false = false
        /** Check that the last parsed move is valid. */
        const isLastMoveValid = () => {
            return (lastMove && !Object.prototype.hasOwnProperty.call(lastMove, 'error'))
        }
        parse_moves:
        for (let pos=0; pos<pgn.moves.length; pos++) {
            let annotation = null
            switch (pgn.moves.charAt(pos)) {
                // Catch end of SAN string
                case ' ':
                case '\b':
                case '\f':
                case '\n':
                case '\t':
                    break
                case ';':
                    if (!isLastMoveValid()) {
                        break
                    }
                    lastMove = lastMove as Turn
                    // End of line annotation
                    end = pgn.moves.indexOf('\n', pos + 1)
                    if (end === -1) { // No more newlines before move part end
                        end = pgn.moves.length - 1
                    }
                    annotation = new Annotation(pgn.moves.substring(pos + 1, end).trim())
                    // Append annotation to move
                    lastMove.annotations.push(annotation)
                    pos = end
                    break
                case '{':
                    if (!isLastMoveValid()) {
                        break
                    }
                    lastMove = lastMove as Turn
                    // In-line annotation
                    end = pos+1
                    while (pgn.moves.charAt(end) !== '}') {
                        end++
                    }
                    annotation = new Annotation(pgn.moves.substring(pos+1, end).replace(/[\n\r\t]/g, ' '))
                    // Append annotation to move
                    lastMove.annotations.push(annotation)
                    pos = end
                    break
                case '(':
                    if (!isLastMoveValid()) {
                        break
                    }
                    // Another variation
                    if (pgn.moves.charAt(pos+1) === '*') {
                        // This is a Palview style continuation variation
                        openVariation(true)
                        pos++
                    } else {
                        openVariation(false)
                    }
                    break
                case ')':
                    if (!isLastMoveValid()) {
                        break
                    }
                    closeVariation()
                    break
                case '!':
                case '?':
                case '$':
                    if (!isLastMoveValid()) {
                        break
                    }
                    lastMove = lastMove as Turn
                    // NAG (or Numeric Annotation Glyph)
                    end = pos + 1
                    while (pgn.moves.charAt(end).match(/[!?\d]/) !== null) {
                        end++
                    }
                    // Append NAG to move
                    if (pgn.moves.charAt(pos) === '$') {
                        lastMove.annotations.push(new Annotation('', parseInt(pgn.moves.substring(pos+1, end))))
                    } else {
                        lastMove.annotations.push(new Annotation('', parseInt(pgn.moves.substring(pos, end))))
                    }
                    pos = end - 1 // for loop will add 1 to the pos after break
                    break
                default: {
                    // Just your ordinary SAN move
                    for (let i=0; i<VALID_RESULTS.length; i++) {
                        // Check if this is the end of the game
                        if (pgn.moves.indexOf(VALID_RESULTS[i], pos) === pos) {
                            if (!game.currentBoard.id)
                                end = pgn.moves.length // This is the actual game, so wrap it up
                            else
                                end = pos + VALID_RESULTS[i].length // This was just a variation, keep going
                            pos = end
                            break
                        }
                    }
                    // End of move data?
                    if (pos === pgn.moves.length)
                        break
                    // Pick up the running turn number
                    const mNum = game.currentBoard.turnNum.toString()
                    if (pgn.moves.indexOf(mNum, pos) === pos) {
                        // Skip the move number
                        pos += mNum.length
                        // Skip the dot (including ... for black to move) and white space chars that precede the actua SAN
                        while ('. \n\r\t'.indexOf(pgn.moves.charAt(pos)) !== -1) {
                            pos++
                        }
                    }
                    // Check if this a wildcard move (all wildvard moves are 2 characters long)
                    if (Move.WILDCARD_MOVES.indexOf(pgn.moves.substring(pos, pos+2)) !== -1) {
                        // TODO: And actual mock move for null moves
                        const anyMove = Move.generateWildcardMove(game.currentBoard)
                        if (anyMove.error === undefined) {
                            lastMove = game.makeMove(anyMove as Move, moveOpts)
                        }
                        // Skip null move symbol
                        end = pos + 2
                    } else {
                        // Check the position of the next non-move character
                        end = pos + pgn.moves.substring(pos).search(/[\s${;!?()]/)
                        if (end < pos) {
                            // This was the last move
                            // TODO: Handle incomplete file (missing result information)
                            end = pgn.moves.length
                        }
                        lastMove = game.makeMoveFromSan(pgn.moves.substring(pos, end), moveOpts)
                    }
                    if (Object.prototype.hasOwnProperty.call(lastMove, 'error')) {
                        // Making the move failed
                        Log.error(
                            "PGN move parsing error "
                            + pgn.moves.substring(pos, end)
                            + ": " + (lastMove as { error: string }).error,
                        'Chess'
                    )
                        break parse_moves
                    }
                    // Set the cursor for next entry, skipping all leading white space characters
                    pos = end + (pgn.moves.substring(end).match(/^(\s*)/) || ['',''])[1].length - 1
                    break
                }
            }
        }
        if (game.currentBoard.id !== 0) {
            // One or more variations did not close properly
            // This can be due to sloppy notation, so we'll close them recursively
            while (game.currentBoard.id !== 0) {
                closeVariation()
            }
        }
        /* This should be handled by the Board, would an override property be needed in some cases?
        // Parse game result
        const result = pgn.moves.substring(pgn.moves.length - 3)
        if (result === '1-0') {
            if (game.currentBoard.isInCheckmate) {
                game.currentBoard.endState.result = {
                    [Chess.Color.WHITE]: Game.RESULT.WIN_BY.CHECKMATE,
                    [Chess.Color.BLACK]: Game.RESULT.LOSS_BY.CHECKMATE,
                }
            } else {
                game.currentBoard.endState.result = {
                    [Chess.Color.WHITE]: Game.RESULT.WIN,
                    [Chess.Color.BLACK]: Game.RESULT.LOSS,
                }
            }
        } else if (result === '0-1') {
            if (game.currentBoard.isInCheckmate) {
                game.currentBoard.endState.result = {
                    [Chess.Color.WHITE]: Game.RESULT.LOSS_BY.CHECKMATE,
                    [Chess.Color.BLACK]: Game.RESULT.WIN_BY.CHECKMATE,
                }
            } else {
                game.currentBoard.endState.result = {
                    [Chess.Color.WHITE]: Game.RESULT.LOSS,
                    [Chess.Color.BLACK]: Game.RESULT.WIN,
                }
            }
        } else if (pgn.moves.substring(pgn.moves.length - 7) === '1/2-1/2') {
            if (game.currentBoard.isInStalemate) {
                game.currentBoard.endState.result = {
                    [Chess.Color.WHITE]: Game.RESULT.DRAW_BY.STALEMATE,
                    [Chess.Color.BLACK]: Game.RESULT.DRAW_BY.STALEMATE,
                }
            } else if (game.currentBoard.breaks75MoveRule) {
                game.currentBoard.endState.result = {
                    [Chess.Color.WHITE]: Game.RESULT.DRAW_BY.SEVENTYFIVE_MOVE_RULE,
                    [Chess.Color.BLACK]: Game.RESULT.DRAW_BY.SEVENTYFIVE_MOVE_RULE,
                }
            } else if (game.currentBoard.breaks50MoveRule) {
                game.currentBoard.endState.result = {
                    [Chess.Color.WHITE]: Game.RESULT.DRAW_BY.FIFTY_MOVE_RULE,
                    [Chess.Color.BLACK]: Game.RESULT.DRAW_BY.FIFTY_MOVE_RULE,
                }
            } else if (game.currentBoard.hasRepeatedFivefold) {
                game.currentBoard.endState.result = {
                    [Chess.Color.WHITE]: Game.RESULT.DRAW_BY.FIVEFOLD_REPETITION,
                    [Chess.Color.BLACK]: Game.RESULT.DRAW_BY.FIVEFOLD_REPETITION,
                }
            } else if (game.currentBoard.hasRepeatedThreefold) {
                game.currentBoard.endState.result = {
                    [Chess.Color.WHITE]: Game.RESULT.DRAW_BY.THREEFOLD_REPETITION,
                    [Chess.Color.BLACK]: Game.RESULT.DRAW_BY.THREEFOLD_REPETITION,
                }
            } else {
                game.currentBoard.endState.result = {
                    [Chess.Color.WHITE]: Game.RESULT.DRAW,
                    [Chess.Color.BLACK]: Game.RESULT.DRAW,
                }
            }
            game.currentBoard.endState.header = result
        }
        */
        return this.addGame(game, group)
    }

    /**
     * This is a workaround for cases when the property activeGame
     * gets cached and might return the wrong game.
     * @returns Game or null
     */
    getActiveGame () {
        return this.activeGame
    }

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
    loadParsedGame (index: number, group=this.active.group) {
        // Make sure such a game is cached
        if (!Object.prototype.hasOwnProperty.call(this.parsedPgnGames, group) || this.parsedPgnGames[group][index] === undefined) {
            return null
        }
        return this.createGameFromParsed(this.parsedPgnGames[group][index])
    }

    /**
     * Load a small number of games from a PGN collection or return header information
     * @param pgn PGN game collection
     * @param group Group the game is in (defaults to currently active group)
     * @param opts ```
     * Object<{
     *     maxItems: number (int),       // maximum number of games to load (default 10), will parse only header information beyond this
     *     loadFirst: boolean,           // automatically load the first game (default true)
     *     returnHeaders: () => string,  // return headers using this function, otherwise return them when function finishes
     *     resetGroup: boolean,          // reset currently cached games (default true) or append newly parsed games to the list
     * }>
     * ```
     * @return gameHeaders
     */
    loadPgn (pgn: string, group=this.active.group, opts: MethodOptions.Chess.loadPgn = {}) {
        const options = Options.Chess.loadPgn().assign(opts) as MethodOptions.Chess.loadPgn
        // Check that group exists
        if (group !== this.active.group && !Object.prototype.hasOwnProperty.call(this.games, group)) {
            this.games[group] = []
        }
        // Strip carriage returns or convert them to new lines from PGN
        pgn = pgn.replace(/\r\n?/g, '\n')
        // Load individual games from the PGN, cache them for later loading
        if (options.resetGroup) {
            this.parsedPgnGames[group] = []
            this.games[group] = []
            if (this.active.group === group) {
                this.active.index = -1
            }
        } else if (!Object.prototype.hasOwnProperty.call(this.parsedPgnGames, group)) {
            // Create a group if it doesn't exist
            this.parsedPgnGames[group] = []
        }
        this.parsedPgnGames[group] = this.parsedPgnGames[group].concat(this.parseFullPgn(pgn))
        const pgnGameCount = this.parsedPgnGames[group].length
        const headers = [] as string[][][]
        if (pgnGameCount) { // At least one game was found
            if (pgnGameCount <= (options.maxItems as number)) {
                for (let i=0; i<pgnGameCount; i++) {
                    const game = this.createGameFromParsed(this.parsedPgnGames[group].splice(i, 1)[0]).game
                    if (this.active.group === group && this.active.index === -1 && options.activateFirst) {
                        this.active.index = 0
                    }
                    const newHeaders = [] as string[][]
                    for (const [key, val] of Object.entries(game.headers.standardized())) {
                        if (key) {
                            newHeaders.push([key, val])
                        }
                    }
                    if (options.returnHeaders) {
                        options.returnHeaders([newHeaders])
                    } else {
                        headers.push(newHeaders)
                    }
                }
            } else if (this.active.group === group && this.active.index === -1 && options.activateFirst) {
                const game = this.createGameFromParsed(this.parsedPgnGames[group].splice(0, 1)[0]).game
                const newHeaders = [] as string[][]
                for (const [key, val] of Object.entries(game.headers.standardized())) {
                    if (key) {
                        newHeaders.push([key, val])
                    }
                }
                headers.push(newHeaders)
                this.active.index = 0
            }
            // Combine loaded and parsed headers
            headers.push(...this.parsedPgnGames[group].map(game => game.headers))
            if (options.returnHeaders) {
                // Use the return function if one was supplied
                options.returnHeaders(headers)
                return []
            } else {
                // Otherwise return the headers
                return headers
            }
        }
        return []
    }

    /**
     * Load game(s) from a PGN collection
     * @param pgn - PGN string
     * @param group - Group the game is in (defaults to currently active group)
     * @param opts - ```
     * Object<{
     *    batchSize: number                     // batch size of games to load in one continuous loop (progress is reported between batches, default 10)
     *    maxAmount: number                     // of games to load into memory (default 100)
     *    reportProgress: (progress: number[])  // will use this function return the progress of on loading the games as [loaded, total] (default null)
     *    startFrom: number                     // index to start loading games from (default 0)
     * }>
     * ```
     * @param reset Reset the current PGN cache (default true)
     */
    loadPgnInBatches (pgn: string, group=this.active.group, opts: MethodOptions.Chess.loadPgnInBatches = {}, reset=true) {
        const options = Options.Chess.loadPgn().assign(opts) as MethodOptions.Chess.loadPgnInBatches
        // Check that group exists
        if (group !== this.active.group && !Object.prototype.hasOwnProperty.call(this.games, group)) {
            this.games[group] = []
        }
        // Strip carriage returns or convert them to new lines from PGN
        pgn = pgn.replace(/\r\n?/g, '\n')
        // Load individual games from the PGN, cache them for later loading
        if (reset || !this.parsedPgnGames[this.active.group]?.length) {
            this.parsedPgnGames[this.active.group] = this.parseFullPgn(pgn)
        }
        const pgnGameCount = this.parsedPgnGames[this.active.group].length
        let counter = 0
        if (pgnGameCount) { // At least one game was found
            if (pgnGameCount > (options.batchSize as number)) {
                if (options.reportProgress) {
                    options.reportProgress([0, pgnGameCount])
                } else {
                    Log.info(`Total number of games is ${pgnGameCount}, parsing in batches`, SCOPE)
                }
            }

            let curGame = 0
            const parseGames = () => {
                return new Promise((resolve) => {
                    for (let i=curGame; i<curGame+(options.batchSize as number); i++) {
                        if (i===pgnGameCount) {
                            resolve(true)
                        }
                        this.createGameFromParsed(this.parsedPgnGames[this.active.group][i])
                        counter++
                    }
                    resolve(true)
                }).then(() => {
                    curGame += (options.batchSize as number)
                    if (curGame && !(curGame%(options.batchSize as number)) && curGame < pgnGameCount) {
                        if (options.reportProgress) {
                            options.reportProgress([curGame, pgnGameCount])
                        } else {
                            Log.info(`Parsed ${curGame} games`, SCOPE)
                        }
                        // Wait a short moment mefore starting next batch to avoid WebSocket timeout
                        window.setTimeout(parseGames, 100)
                    } else if (curGame >= pgnGameCount) {
                        if (options.reportProgress) {
                            options.reportProgress([pgnGameCount, pgnGameCount])
                        }
                        Log.info("Finished parsing games", SCOPE)
                        // Purge cache, all games have been processed
                        this.parsedPgnGames[this.active.group] = []
                    } else if (counter >= (options.maxAmount as number)) {
                        if (options.reportProgress) {
                            options.reportProgress([pgnGameCount, pgnGameCount])
                        } else {
                            Log.info("Finished parsing games", SCOPE)
                        }
                    }
                })
            }
            parseGames()
        }
    }

    /**
     * Create a new game.
     * @param fen optional FEN (defaults to traditional starting position and state)
     * @param group The group the game is created in (defaults to currently active group)
     * @param replace Force replace the currently selected game (default false)
     * @return newly added game and its position { game, group, index }
     */
    newGame (fen=Fen.DEFAULT_STARTING_STATE, group=this.active.group, replace=false): GameEntry {
        // Check that group exists
        if (!Object.prototype.hasOwnProperty.call(this.games, group)) {
            this.games[group] = []
        }
        if (this.active.group !== group) {
            // Add new game but don't activate it, if it's in another group
            const newGame = new Game(fen)
            this.games[group].push(newGame)
            return { game: newGame, group: group, index: this.games[group].length - 1 }
        } else {
            if (this.active.index === -1 || (this.activeGame?.shouldPreserve && !replace)) {
                // Add a new game and activate it
                const newGame = new Game(fen)
                this.games[group].push(newGame)
                this.active.game = newGame
                this.active.index = this.games[group].length - 1
                this.lastActive[group] = this.active.index
            } else {
                // Replace current game
                this.games[group][this.active.index] = new Game(fen)
            }
            return {...this.active}
        }
    }

    /**
     * Parse a PGN file containing one or more game records
     * @param pgn
     * @return array containing games parsed to headers and moves [{ headers, moves }]
     */
    parseFullPgn (pgn: string) {
        const parsed = [] as { headers: [AnyHeader, string][], moves: string }[]
        // Change all new lines to \n
        pgn = pgn.replace(/\r\n|[\n\x0B\x0C\r\u0085\u2028\u2029]/g, '\n')
        // Remove lines that start with %.
        // I couldn't get this to work reliably with a regex; it would always miss something if there were several
        // consecutive ignored lines
        const pgnRows = pgn.split('\n')
        for (let i=0; i<pgnRows.length; i++) {
            if (pgnRows[i].startsWith('%')) {
                pgnRows.splice(i, 1)
                i--
            }
        }
        pgn = pgnRows.join('\n')
        const cleanMoveData = (moves: string) => {
            const standardise = (data: string) => {
                return data.replace(/[\u00A0\u180E\u2000-\u200A\u202F\u205F\u3000]/g," ") // Different white space characters
                           .replace(/\u00BD/g,"1/2") // ½ to 1/2
                           .replace(/[\u2010-\u2015]/g,"-") // different dashes to simple dash
                           .replace(/\u2024/g,".") // Dot
                           .replace(/[\u2025-\u2026]/g,"...") // Multi-dot characters to ...
                           .replace(/[0O]-[0O]-[0O]/ig, 'O-O-O') // Queen side castle with zeroes instead of O's
                           .replace(/[0O]-[0O]/ig, 'O-O') // King side castle with zeroes instead of O's
                           .replace(/\\"/g,"'") // Accidental double quotes in place of single quotes
                           .replace(/\s+!/g,"!") // Space before exclamation marks
                           .replace(/\s+\?/g,"?") // Space before question marks
            }
            // We'll clean the move data part of the PGN, but leave comments untouched
            const cleanedData = []
            let moveData = ''
            for (let i=0; i<moves.length; i++) {
                if (moves.charAt(i) === '{') {
                    // Bracketed comment started, continue until the next }
                    cleanedData.push(standardise(moveData))
                    moveData = moves.charAt(i)
                    do {
                        i++
                        moveData += moves.charAt(i)
                    } while (moves.charAt(i) !== '}' && i < moves.length)
                    cleanedData.push(moveData)
                    moveData = ''
                } else if (moves.charAt(i) === ';') {
                    // Comment until the end of this line
                    cleanedData.push(standardise(moveData))
                    moveData = moves.charAt(i)
                    do {
                        i++
                        moveData += moves.charAt(i)
                    } while (moves.charAt(i) !== '\n' && i < moves.length)
                    cleanedData.push(moveData)
                    moveData = ''
                } else {
                    // Just your regular move data
                    moveData += moves.charAt(i)
                }
            }
            if (moveData.length) {
                cleanedData.push(standardise(moveData))
            }
            return cleanedData.join('')
        }
        // Some variables
        const headerFormat = /\s*(\[\s*\w+\s*"[^"]*"\s*\]\s*)+/ // Matches multi-line headers
        let lHeader = null // Latest matching header
        let moveData = ""
        // Check that the PGN has at least one valid header
        if (headerFormat.exec(pgn)) {
            // Retrieve all games
            let match: RegExpMatchArray | null = null
            while ((match = headerFormat.exec(pgn)) !== null) {
                // Store the matching header
                const nHeader = match[0]
                // Set starting and ending position of the match
                const mStart = pgn.indexOf(nHeader)
                const mEnd = mStart + nHeader.length
                if (lHeader !== null) {
                    // Retrieve the remaining move data before next header
                    moveData += pgn.slice(0, mStart)
                    // Make sure that we are not grabbing comment contents instead of a true header
                    if (moveData.indexOf('{') < 0 && moveData.indexOf('}') < 0
                      || (moveData.lastIndexOf('}') > moveData.lastIndexOf('{')
                        && (moveData.match(/\{/g) || []).length === (moveData.match(/\}/g) || []).length
                      )
                    ) {
                        // Split header into parts
                        const headers = lHeader.split('\n')
                        const meta = [] as [AnyHeader, string][]
                        for (let i=0; i<headers.length; i++) {
                            const header = headers[i].trim()
                            // Retrieve header key and value
                            if (header.length) {
                                const key = (header.match(/^\[([A-Z][A-Za-z]*)\s.*\]$/) || ['',''])[1]
                                const value = (header.match(/^\[[A-Za-z]+\s"(.*)"\]$/) || ['',''])[1]
                                if (key.length) {
                                    meta.push([key, value])
                                }
                            }
                        }
                        parsed.push({ headers: meta, moves: cleanMoveData(moveData) })
                        // Clear the data
                        moveData = ""
                        // Store header information
                        lHeader = nHeader
                    } else {
                        // This is not a header, so store it as move data
                        moveData += nHeader
                    }
                } else {
                    lHeader = nHeader
                }
                // Strip the processed part from the PGN
                pgn = pgn.slice(mEnd)
            }
        } else {
            // Return null if the file didnt' contain any valid entries
            if (pgn.length) {
                return [{ headers: [], moves: cleanMoveData(pgn) }]
            } else
                return []
        }
        if (lHeader) {
            // Process last headers
            const headers = lHeader.split('\n')
            const meta = [] as [AnyHeader, string][]
            for (let i=0; i<headers.length; i++) {
                const header = headers[i].trim()
                // Retrieve header key and value
                if (header.length) {
                    const key = (header.match(/^\[([A-Z][A-Za-z]*)\s.*\]$/) || ['',''])[1]
                    const value = (header.match(/^\[[A-Za-z]+\s"(.*)"\]$/) || ['',''])[1]
                    if (key.length) {
                        meta.push([key, value])
                    }
                }
            }
            // Append last entry and return parsed PGN
            parsed.push({ headers: meta, moves: cleanMoveData(moveData+pgn) })
        }
        return parsed
    }

    /**
     * Remove the game at index from given group.
     * Arguments have individual defaults, so either override both or neither!
     * @param group defaults to currently active group
     * @param index defaults to currently active game
     */
    removeGame (group=this.active.group, index=this.active.index) {
        if (index === -1) {
            return
        }
        if (Object.prototype.hasOwnProperty.call(this.games, group) && this.games[group][index] !== undefined) {
            // Save removed game for possible undo
            this.lastRemoved = {
                group: group,
                index: index,
                game: this.games[group].splice(index, 1)[0]
            }
            if (group === this.active.group) {
                if (this.active.index) {
                    // Go to previous game on list, if one exists
                    this.active.index--
                } else if (!this.games[group].length) {
                    // If there are no more games in this group, unset
                    this.unsetActiveGame()
                } // Else, index staying the same, the next game on the list becomes active
                this.lastActive[group] = this.active.index
            }
        }
    }

    /**
     * Reset the game in group at index to default (starting) state.
     * Arguments have individual defaults, so either override both or neither!
     * @param group defaults to currently active group
     * @param index defaults to currently active game
     */
    resetGame (group=this.active.group, index=this.active.index) {
        if (index === -1) {
            return
        }
        if (Object.prototype.hasOwnProperty.call(this.games, group) && this.games[group][index] !== undefined) {
            this.games[group][index] = new Game(Fen.DEFAULT_STARTING_STATE)
        }
    }

    /**
     * Select the game at the given `index` as the active game.
     * @param index - Index of the game within the group.
     * @param group - Group of the game (defaults to currently active group).
     * @returns The selected Game or null if it doesn't exist.
     */
    selectGame (index: number, group=this.active.group) {
        if (!group) {
            return null
        }
        if (group.length <= index) {
            return null
        }
        if (index < 0) {
            return null
        }
        this.active.index = index
        this.active.game = this.games[group][index]
        return this.games[group][index]
    }

    /**
     * Unset active game, but keep the group.
     */
    unsetActiveGame () {
        this.active.index = -1
        this.active.game = null
    }

    /*
     * ======================================================================
     *                          PASS-THROUGHS
     * ======================================================================
     */

    private static noActiveGameError = { error: 'No active game '}

    get breaks50MoveRule () {
        return this.activeGame?.breaks50MoveRule || false
    }
    get breaks75MoveRule () {
        return this.activeGame?.breaks75MoveRule || false
    }
    get currentMoveVariations () {
        return this.activeGame?.currentMoveVariations || []
    }
    get endState () {
        return this.activeGame?.endState || null
    }
    get hasEnded () {
        return this.activeGame?.hasEnded || false
    }
    get hasInsufficientMaterial () {
        return this.activeGame?.hasInsufficientMaterial || false
    }
    get hasRepeatedFivefold () {
        return this.activeGame?.hasRepeatedFivefold || false
    }
    get hasRepeatedThreefold () {
        return this.activeGame?.hasRepeatedThreefold || false
    }
    get hasStarted () {
        return this.activeGame?.hasStarted || false
    }
    get headers () {
        return this.activeGame?.headers
    }
    get isInCheck () {
        return this.activeGame?.isInCheck || false
    }
    get isInCheckmate () {
        return this.activeGame?.isInCheckmate || false
    }
    get isDraw () {
        return this.activeGame?.isDraw || false
    }
    get isFinished () {
        return this.activeGame?.isFinished || false
    }
    get isInStalemate () {
        return this.activeGame?.isInStalemate || false
    }
    get isPaused () {
        return this.activeGame?.isPaused || false
    }
    get playerToMove () {
        return this.activeGame?.playerToMove || Color.WHITE
    }
    get turnIndexPosition () {
        return this.activeGame?.turnIndexPosition || []
    }
    addHeaders (headers: string[][]) {
        this.activeGame?.addHeaders(headers)
    }
    addTimeControl (tc: typeof ChessTimer.FieldModel) {
        this.activeGame?.addTimeControl(tc)
    }
    continue () {
        this.activeGame?.continue()
    }
    createContinuationFromSan (san:string) {
        return this.activeGame?.createContinuationFromSan(san) || false
    }
    createVariationFromSan (san: string) {
        return this.activeGame?.createVariationFromSan(san) || false
    }
    end () {
        this.activeGame?.end()
    }
    enterContinuation (i?: number) {
        return this.activeGame?.enterContinuation(i) || false
    }
    enterVariation (i?: number) {
        return this.activeGame?.enterVariation(i) || false
    }
    getCapturedPieces (color: PlayerColor, opts?: MethodOptions.Game.getCapturedPieces) {
        return this.activeGame?.getCapturedPieces(color, opts) || []
    }
    getMoves (filter: MethodOptions.Board.getMoves = {}) {
        return this.activeGame?.getMoves(filter) || { blocked: [], illegal: [], legal: [] }
    }
    getMoveHistory (filter?: string) {
        return this.activeGame?.getMoveHistory(filter) || []
    }
    goToStart () {
        this.activeGame?.goToStart()
    }
    loadFen (fen: string) {
        return this.activeGame?.loadFen(fen)
    }
    makeMove (move: Move, opts?: MethodOptions.Board.makeMove) {
        return this.activeGame?.makeMove(move, opts) || Chess.noActiveGameError
    }
    makeMoveFromAlgebraic (orig: BoardSquareName, dest: BoardSquareName, opts?: MethodOptions.Board.makeMove) {
        return this.activeGame?.makeMoveFromAlgebraic(orig, dest, opts) || Chess.noActiveGameError
    }
    makeMoveFromSan (san: string, opts?: MethodOptions.Board.makeMove) {
        return this.activeGame?.makeMoveFromSan(san, opts) || Chess.noActiveGameError
    }
    moveHistoryToNewContinuation () {
        return this.activeGame?.moveHistoryToNewContinuation() || false
    }
    moveHistoryToNewVariation (newTurn?: Turn) {
        return this.activeGame?.moveHistoryToNewVariation(newTurn) || false
    }
    nextTurn () {
        return this.activeGame?.nextTurn() || false
    }
    pause () {
        this.activeGame?.pause()
    }
    pieceAt (sqr: BoardSquareIndex | BoardSquareName) {
        return this.activeGame?.pieceAt(sqr) || Piece.NONE
    }
    placePiece (piece: Piece, square: BoardSquareIndex | BoardSquareName) {
        return this.activeGame?.placePiece(piece, square) || false
    }
    prevTurn () {
        return this.activeGame?.prevTurn() || false
    }
    removePiece (square: BoardSquareIndex | BoardSquareName) {
        return this.activeGame?.removePiece(square) || Piece.NONE
    }
    returnFromContinuation () {
        return this.activeGame?.returnFromContinuation() || false
    }
    returnFromVariation () {
        return this.activeGame?.returnFromVariation() || false
    }
    selectTurn (index: number, boardIdx?: number) {
        return this.activeGame?.selectTurn(index, boardIdx) || false
    }
    setTimeControlFromPgn (tc: string) {
        this.activeGame?.setTimeControlFromPgn(tc)
    }
    setTimerReportFunction (f: ((timers: TCTimeValues) => void) | null) {
        this.activeGame?.setTimerReportFunction(f)
    }
    start () {
        return this.activeGame?.start() || false
    }
    toFen (options = {}) {
        return this.activeGame?.toFen(options) || ''
    }
    toPgn (options = {}) {
        return this.activeGame?.toPgn(options) || ''
    }
    toString () {
        return this.activeGame?.toString() || ''
    }
    updateSetup () {
        this.activeGame?.updateSetup()
    }
    validateFen (fen: string, onlyPosition?: boolean, rules?: string) {
        return new Fen(fen).validate(onlyPosition, rules)
    }
}
