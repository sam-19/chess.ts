import Board from './board'
import Color from './color'
import Log from './log'
import Fen from './fen'
import Headers from './headers'
import Move from './move'
import Options from './options'
import Piece from './piece'
import TimeControl from './time_control'

import { ChessGame } from '../types/game'
import { MethodOptions } from '../types/options'

class Game implements ChessGame {
    // Static properties
    // Each player gets their own result code
    // For example, if white runs out of time but black does not have enough material to deliver a checkmate
    //  white gets draw by timeout and black gets draw by insufficient material
    static readonly RESULT = {
        UNKNOWN: 'u',
        ABANDONED: 'a',
        WIN: 'w',
            WIN_BY: {
                CHECKMATE: 'w:checkmate',
                RESIGNATION: 'w:resignation',
                ARBITER_DECISION: 'w:arbiter',
                RULE_VIOLATION: 'w:violation', // Basically a special case of ARBITER_DECISION
                TIMEOUT: 'w:timeout',  // Opponent's flag falls (time runs out) during the time control
                FORFEIT: 'w:forfeit', // Opponent didn't arrive to start the game in time
            },
        LOSS: 'l',
            LOSS_BY: {
                CHECKMATE: 'l:checkmate',
                RESIGNATION: 'l:resignation',
                ARBITER_DECISION: 'l:arbiter',
                RULE_VIOLATION: 'l:violation',
                TIMEOUT: 'l:timeout',
                FORFEIT: 'l:forfeit',
            },
        DRAW: 'd',
            DRAW_BY: {
                STALEMATE: 'd:stalemate',
                INSUFFICIENT_MATERIAL: 'd:material', // A game where both players have in sufficient material is in a 'dead position'
                MUTUAL_AGREEMENT: 'd:agreement',
                ARBITER_DECISION: 'd:arbiter',
                THREEFOLD_REPETITION: 'd:repetition',
                INTENDED_THREEFOLD_REPETITION: 'd:repetition:intended', // One player intends to claim three-fold repetition on their next move
                FIVEFOLD_REPETITION: 'd:repetition:arbiter',
                FIFTY_MOVE_RULE: 'd:moverule',
                INTENDED_FIFTY_MOVE_RULE: 'd:moverule:intended',
                SEVENTYFIVE_MOVE_RULE: 'd:moverule:arbiter',
                TIMEOUT: 'd:timeout',
            },
    }
    static readonly STATE = {
        SETUP: 'setup',
        READY: 'ready',
        RUNNING: 'running',
        PAUSED: 'paused',
        FINISHED: 'finished',
    }

    // Instance properties
    headers: Headers
    boardVars: Board[]
    currentBoard: Board
    active: boolean
    timeControl: TimeControl
    startTime: Date | null
    pauseTimes: (Date|null)[][]
    endTime: Date | null
    result = {
        [Color.WHITE]: '',
        [Color.BLACK]: '',
    }
    shouldPreserve: boolean

    constructor (
        fen = Fen.DEFAULT_STARTING_STATE,
        pgnHeaders: string[][] = []
    ) {
        // Set headers
        this.headers = new Headers(pgnHeaders)
        // Store all board variations in an array
        this.boardVars = []
        // Create the first board variation, i.e. the actual game
        if (fen !== null && fen !== "") {
            const board = Board.createFromFen(this, fen)
            if (board) {
                this.currentBoard = board
            } else {
                Log.error(`Could not create board from FEN "${fen}", using starting state instead!`)
                this.currentBoard = new Board(this)
            }
            // Set appropriate header if we are not starting from default
            if (fen !== Fen.DEFAULT_STARTING_STATE) {
                this.headers.set('setup', '1')
                this.headers.set('fen', fen)
            }
        } else { // Initialize and empty board variation
            this.currentBoard = new Board(this)
        }
        this.active = false
        this.timeControl = new TimeControl()
        this.startTime = null
        this.pauseTimes = []
        this.endTime = null
        /**
         * Should this game be preserved or is it safe to overwrite it?
         * A game should be preserved at least after it has been started and
         * after moves have been made (in analysis mode)
         */
        this.shouldPreserve = false
    }
    /**
     * Load a new game from a FEN string, overwriting a possible previous game
     * @param fen
     * @return true on success, false on failure
     */
    loadFen (fen: string) {
        const newBoard = Board.createFromFen(this, fen)
        if (newBoard) {
            this.currentBoard = newBoard
            this.updateSetup()
            // Reset board variations
            this.boardVars = [newBoard]
            return true
        } else {
            return false
        }
    }
    /**
     * Add a field to the game's time controls
     * @param tc TimeControl.FieldModel
     */
    addTimeControl (tc: typeof TimeControl.FieldModel) {
        if (!this.hasStarted()) {
            if (this.timeControl === null) {
                this.timeControl = new TimeControl()
            }
            this.timeControl.addField(tc)
        }
    }
    /**
     * Set the game's time control from a PGN TimeControl field value
     * @param tc PGN TimeControl field value
     */
    setTimeControlFromPGN (tc: string) {
        if (!this.hasStarted()) {
            if (this.timeControl === null) {
                this.timeControl = new TimeControl()
            }
            this.timeControl.parsePGNTimeControl(tc)
        }
    }
    /**
     * Set the function used to report time control progress
     * @param f report function will return { elapsed: { w, b }, remaining: { w, b } }
     */
    setTimeControlReportFunction (f: any) {
        if (!this.hasStarted()) {
            this.timeControl.setReportFunction(f)
        }
    }
    /**
     * Continue the currently paused game
     */
    continue () {
        // Check that game is ongoing and that it is paused
        if (this.hasStarted() && !this.hasEnded() && this.isPaused()) {
            // Make sure pause timestamps are in sync
            const timestamp = new Date()
            this.pauseTimes[this.pauseTimes.length - 1][1] = timestamp
            if (this.timeControl !== null) {
                this.timeControl.continueTimer(timestamp.getTime())
            }
        }
    }
    /**
     * End the current game
     * @param result '1-0' | '0-1' | '1/2-1/2' (default '1/2-1/2')
     */
    end (result='1/2-1/2') {
        if (this.startTime !== null && this.endTime === null) {
            const timestamp = new Date()
            this.endTime = timestamp
            if (this.timeControl !== null) {
                this.timeControl.stopTimer(timestamp.getTime())
            }
            this.headers.set('result', result)
        }
    }
    /**
     * Pause the currently active game
     */
    pause () {
        // Check that game is ongoing and that it isn't paused already
        if (this.hasStarted() && !this.hasEnded() && !this.isPaused()) {
            // Make sure pause timestamps are in sync
            const timestamp = new Date()
            this.pauseTimes.push([timestamp, null])
            if (this.timeControl !== null) {
                this.timeControl.pauseTimer(timestamp.getTime())
            }
        }
    }
    /**
     * Start the game, saving the current timestamp as game start time and starting the clock for white
     */
    start () {
        if (!this.currentBoard) {
            return false
        }
        if (this.timeControl !== null && this.timeControl.getReportFunction() === null) {
            Log.error("Cannot start game before time control report function is set!")
            return false
        }
        if (!this.hasStarted()) {
            this.startTime = new Date()
            if (this.timeControl !== null) {
                if (this.currentBoard.plyNum !== 1) {
                    this.timeControl.setPlyNum(this.currentBoard.plyNum)
                }
                this.timeControl.startTimer()
            }
            // Preserve started game
            this.shouldPreserve = true
            return true
        }
        return false
    }
    /**
     * Check if the game has ended
     */
    hasEnded () {
        return this.endTime !== null
    }
    /**
     * Check if the game has started
     */
    hasStarted () {
        return this.startTime !== null
    }
    /**
     * Check if the game is paused
     */
    isPaused () {
        return (this.pauseTimes.length && this.pauseTimes[this.pauseTimes.length - 1][1] === null)
    }
    /**
     * Make a move from Move object
     * @param move
     * @param options Options.Board.makeMove
     */
    makeMove (move: Move, opts: MethodOptions.Game.makeMove = {}) {
        const options = Options.Game.makeMove().assign(opts) as MethodOptions.Game.makeMove
        // Update time controls if need be
        if (this.timeControl !== null) {
            this.timeControl.moveMade(this.currentBoard.plyNum, options.takeback)
        }
        // TODO: Right now this check is done twice, because Board.makeMove() checks for it too
        const { isNew, contIdx, varIdx } = this.currentBoard.isNewMove(move)
        if (isNew) {
            let newVar
            if (!options.branchVariation && (newVar = this.moveHistoryToNewVariation())) {
                const newMove = this.currentBoard.makeMove(move, options)
                if (newMove) {
                    newMove.variations.push(newVar)
                }
                return newMove
            }
        } else if (!options.branchVariation) {
            const curMoveIdx = this.currentBoard.getMoveIndexPosition()[0]
            if (contIdx !== -1) {
                const matchingCont = this.currentBoard.getSelectedTurn().variations.splice(contIdx, 1)[0]
                if (this.moveHistoryToNewVariation(true)) {
                    // Update parent variations and move indices in the continuation
                    for (let i=0; i<matchingCont.history.length; i++) {
                        for (let j=0; j<matchingCont.history[i].variations.length; j++) {
                            matchingCont.history[i].variations[j].parentBoard = this.currentBoard
                            matchingCont.history[i].variations[j].parentBranchTurnIndex = curMoveIdx + i
                        }
                    }
                    // Append the matching continuation to current turn history
                    this.currentBoard.history.push(...matchingCont.history)
                } else {
                    Log.error("Failed to move current history into a new continuation!")
                }
            } else if (varIdx !== -1) {
                const matchingVar = this.currentBoard.history[curMoveIdx + 1].variations.splice(varIdx, 1)[0]
                if (this.moveHistoryToNewVariation(true)) {
                    // Update parent variations and move indices in the continuation
                    for (let i=0; i<matchingVar.history.length; i++) {
                        for (let j=0; j<matchingVar.history[i].variations.length; j++) {
                            matchingVar.history[i].variations[j].parentBoard = this.currentBoard
                            matchingVar.history[i].variations[j].parentBranchTurnIndex = curMoveIdx + i
                        }
                    }
                    // Append the matching continuation to current turn history
                    this.currentBoard.history.push(...matchingVar.history)
                } else {
                    Log.error("Failed to move current history into a new continuation!")
                }
            }
        }
        // Preserve a game after first move, if it was made by a player or otherwise is flagged for preservation
        if (!this.shouldPreserve && (options.isPlayerMove || options.preserveGame)) {
            this.shouldPreserve = true
        }
        const turn = this.currentBoard.makeMove(move, options)
        // Handle possible game end in root variation
        const isFinished = this.currentBoard.isFinished()
        if (!this.currentBoard.id && isFinished) {
            this.result = isFinished.result
            this.headers.set('result', isFinished.headers)
        }
        return turn
    }
    /**
     * Make a move from origination to destination square
     * @param orig (a1...h8)
     * @param dest (a1...h8)
     * @param options Options.Board.makeMove
     */
    makeMoveFromAlgebraic (orig: string, dest: string, options={} as MethodOptions.Board.makeMove) {
        const move = Move.generateFromAlgebraic(orig, dest, this.currentBoard)
        if (move.error !== undefined) {
            Log.error(`Cound not make move from algebraic (${orig}-${dest}): ${move.error}`)
            return move
        }
        Log.debug(`Making a move from algebraic: ${orig}-${dest}.`)
        return this.makeMove(move as Move, options)
    }
    /**
     * Make move from a SAN string
     * @param san
     * @param options Options.Board.makeMove
     */
    makeMoveFromSan (san: string, options={} as MethodOptions.Board.makeMove) {
        const move = Move.generateFromSan(san, this.currentBoard)
        if (move.error !== undefined) {
            Log.error(`Cound not make move from SAN (${san}): ${move.error}`)
            return move
        }
        Log.debug(`Making a move from SAN: ${san}.`)
        return this.makeMove(move as Move, options)
    }
    /**
     * Move the rest of the current board's turn history to a new variation of this move
     * @param continuation (default false) if true, attach the new variation as a continuation to the
     *                               last move of remaining history, otherwise return it
     * @return new board if created as variation, true if attached as continuation, or false if
     *                         there is no history to move
     */
    moveHistoryToNewVariation (continuation=false) {
        const movePos = this.currentBoard.getMoveIndexPosition()
        if (movePos[0] === movePos[1] - 1) {
            // Already at the end of current board's turn history
            return false
        }
        // This move has already been played. In order to not branch a new variation, we have to move
        // all subsequent moves to a new variation and continue on the current board.
        this.currentBoard.selectMove(movePos[0])
        const futureTurns = this.currentBoard.history.splice(movePos[0] + 1)
        const newVariation = Board.createFromParent(this.currentBoard, { continuation: continuation })
        for (let i=0; i<futureTurns.length; i++) {
            if (futureTurns[i].variations) {
                for (let j=0; j<futureTurns[i].variations.length; j++) {
                    // Update possible parent variations and branch points for variations for relocated moves
                    futureTurns[i].variations[j].parentBoard = newVariation
                    futureTurns[i].variations[j].parentBranchTurnIndex = i
                }
            }
        }
        newVariation.history = futureTurns
        if (continuation) {
            this.currentBoard.getSelectedTurn().variations.push(newVariation)
            return true
        } else {
            return newVariation
        }
    }
    /**
     * Export the game as PGN
     * @param options { lengthMeasure: 'width|moves', maxLength: int, newLine: '\n',
     *                           showHeaders: boolean, showMoveCursor: boolean, wrapMoves: boolean }
     */
    toPgn (options={} as MethodOptions.Game.toPgn) {
        options = Options.Game.toPgn().assign(options) as MethodOptions.Game.toPgn
        let pgnHeaders = []
        // Start by adding headers
        if (options.showHeaders) {
            for (let i=0; i<this.headers.length(); i++) {
                pgnHeaders.push(`[${this.headers.getKey(i)} "${this.headers.getValue(i)}"]`)
            }
            // Add empty line after headers
            if (this.headers.length())
                pgnHeaders.push("")
        }
        let rootVar = this.boardVars[0]
        const pgnMoves = processVariation(rootVar, 1, this.currentBoard)
        // Auxiliary function to process the variations
        function processVariation (variation: Board, moveNum: number, currentBoard: Board) {
            let varMoves = [] as string[]
            let varMoveStr = ""
            let firstMove = true
            let lastMove = false
            // Add first annotations if they exist
            if (variation.turnAnnotations[0]) {
                varMoves = varMoves.concat('{' + variation.turnAnnotations[0].join('}{') + '}')
            }
            for (let i=0; i<variation.history.length; i++) {
                let turn = variation.history[i]
                firstMove = (i === 0)
                // If variation starts with black to play, add ...
                if (firstMove && turn.move.movedPiece?.color === Color.BLACK) {
                    varMoves.push(moveNum + "...")
                    moveNum++
                } else if ((firstMove || lastMove) && turn.move.movedPiece?.color === Color.BLACK && !variation.continuation) {
                    // Check if black is to move at the start of new variation or after the last move of a variation
                    varMoves.push((moveNum-1) + "...") // Traditional variation
                } else if (turn.move.movedPiece?.color === Color.WHITE) {
                    // Add move numer before white move
                    varMoves.push(moveNum + ".")
                    moveNum++
                }
                varMoves.push((turn.move.wildcard ? Move.WILDCARD_MOVES[0] : turn.move.san || ''))
                // Print cursor position
                if (options.showMoveCursor && variation === currentBoard && i === currentBoard.selectedTurnIndex) {
                    varMoves.push(" ^")
                }
                // Add annotations
                if (variation.turnAnnotations[i+1]) {
                    varMoves.push('{' + variation.turnAnnotations[i+1].join('}{') + '}')
                }
                // Add variations
                if (variation.history[i].variations.length) {
                    // Add possible annotation at the start of child variation
                    for (let j=0; j<variation.history[i].variations.length; j++) {
                        let childVar = variation.history[i].variations[j]
                        let childVarMoves = processVariation(childVar, moveNum - (childVar.continuation ? 0 : 1), currentBoard)
                        if (!childVarMoves.length)
                            varMoves.push("()") // This variation had no moves
                        else {
                            for (let k=0; k<childVarMoves.length; k++) {
                                varMoveStr = childVarMoves[k]
                                // Start continuation variations with an asterisk
                                if (!k) {
                                    varMoveStr = "(" + (childVar.continuation ? "*" : "") + varMoveStr
                                }
                                if (k === childVarMoves.length - 1) {
                                    varMoveStr += ")"
                                }
                                varMoves.push(varMoveStr)
                            }
                        }
                        lastMove = true
                    }
                } else {
                    lastMove = false
                }
            }
            return varMoves
        }
        // Check for result
        const resultCode = this.headers.get('Result')
        if (resultCode !== undefined) {
            pgnMoves.push(resultCode)
        }
        // Join the results and moves into a string
        let result = pgnHeaders.join(options.newLine)
        if (pgnHeaders.length && pgnMoves.length) {
            result += options.newLine
        }
        if (!options.maxLength) {
            result += pgnMoves.join(' ')
        } else {
            // We'll wrap the lines to desired length
            let wrappedLines = [""]
            let curMove = ""
            let moveCount = 0
            // Sanity check, at least one complete move should fit on a line!
            if (options.lengthMeasure === 'width' && options.maxLength < 20) {
                options.maxLength = 20
            }
            for (let i=0; i<pgnMoves.length; i++) {
                // Go through all the move entries
                if (!options.wrapMoves) {
                    // We'll wrap lines as closely as possible (even within a move)
                    if ((wrappedLines[wrappedLines.length-1].length + pgnMoves[i].length + 1) <= options.maxLength) {
                        wrappedLines[wrappedLines.length-1] += " " + pgnMoves[i]
                    } else {
                        wrappedLines.push(pgnMoves[i])
                    }
                } else if (curMove === "") { // Just add the first entry
                    curMove = pgnMoves[i]
                } else {
                    // We'll wrap moves on their own lines
                    if (pgnMoves[i].match(/^\(?\*?\d+\.(\.\.)?$/) !== null) { // Check if we are starting a new move
                        // Wrap lines either by their width or by the number of moves
                        if (options.lengthMeasure === "width") {
                            if ((wrappedLines[wrappedLines.length-1].length + curMove.length + 1) <= options.maxLength) {
                                // Append last processed move to last wrapped line, if there is room
                                if (wrappedLines[wrappedLines.length-1] !== "") {
                                    wrappedLines[wrappedLines.length-1] += " " + curMove
                                } else {
                                    wrappedLines[wrappedLines.length-1] += curMove
                                }
                            } else { // Begin a new wrapped line
                                wrappedLines.push(curMove)
                            }
                        } else if (options.lengthMeasure === "moves") {
                            if (options.maxLength < 1) // Sanity check, there should be at least one move per line!
                                options.maxLength = 1
                            if (moveCount < options.maxLength) { // Check that we don't have too many moves on this line already
                                if (wrappedLines[wrappedLines.length-1] !== "")
                                    wrappedLines[wrappedLines.length-1] += " " + curMove
                                else
                                    wrappedLines[wrappedLines.length-1] += curMove
                                moveCount++
                            } else {
                                wrappedLines.push(curMove)
                                moveCount = 1
                            }
                        }
                        // Begin a new move
                        curMove = pgnMoves[i]
                    } else {
                        // Append plies to current move
                        curMove += " " + pgnMoves[i]
                    }
                }
            }
            // Add the final move if needed
            if (curMove !== "") { // This check will also fail if options.wrapMoves is false, because curMove is never used
                if (options.lengthMeasure === "width") {
                    if ((wrappedLines[wrappedLines.length-1].length + curMove.length + 1) <= options.maxLength)
                        wrappedLines[wrappedLines.length-1] += " " + curMove
                    else
                        wrappedLines.push(curMove)
                } else if (options.lengthMeasure === "moves") {
                    if (moveCount < options.maxLength)
                        wrappedLines[wrappedLines.length-1] += " " + curMove
                    else
                        wrappedLines.push(curMove)
                }
            }
            // First add the wrapped lines
            result += wrappedLines.join(options.newLine)
        }
        return result
    }
    /**
     * Alias for createVariationFromSAN(continuation = true)
     */
    createContinuationFromSan (san: string) {
        return this.createVariationFromSan(san, true)
    }
    /**
     * Create a new variation for currently selected move from given SAN
     * @param san
     * @param continuation is this a continuation (default false = variation)
     * @return true on success, false on failure
     */
    createVariationFromSan (san: string, continuation=false) {
        // Check that a SAN string is given
        if (san === undefined || san === null || san === "") {
            Log.error(`Failed to create a new variation/continuation from SAN (${san}): Invalid input.`)
            return false
        }
        let addition = (continuation ? 1 : 0)
        // Check that we have not reached the end of the current variation
        if (this.currentBoard.selectedTurnIndex < this.currentBoard.history.length - addition) {
            // Check that the given SAN is really generating a new variation
            if (san === this.currentBoard.history[this.currentBoard.selectedTurnIndex + addition].move.san) {
                Log.debug(`Did not create a new variation from SAN (${san}): Move matches the next move in current variation.`)
                return false
            } else if (Move.WILDCARD_MOVES.indexOf(san) !== -1) {
                if (!continuation) {
                    Log.error(`Did not create a new variation from SAN (${san}): Cannot start a new variation with a wilcard move.`)
                    return false
                } // TODO: Continuation can be started with a wilcard move, but does this require extra handling?
            }
        } else {
            Log.warn(`Cannot create a new variation from SAN (${san}): Already at the end of current variation.`)
            return false
        }
        // Create the new variation
        const newBoard = Board.createFromParent(this.currentBoard, continuation)
        this.boardVars.push(newBoard)
        this.currentBoard.history[this.currentBoard.selectedTurnIndex].variations.push(newBoard)
        this.currentBoard = newBoard
        const move = Move.generateFromSan(san, this.currentBoard)
        if (move.error === undefined) {
            // Check that we can make this move
            if (this.currentBoard.makeMove(move as Move)) {
                if (continuation) {
                    Log.debug(`New (continuation) variation started from SAN: ${san}`)
                } else {
                    Log.debug(`New variation started from SAN: ${san}`)
                }
                return true
            } else {
                return false
            }
        } else {
            Log.debug(move.error)
            // Return to parent variation and remove new variation from its child variations
            this.currentBoard = this.currentBoard.parentBoard as Board
            this.currentBoard.history[this.currentBoard.selectedTurnIndex].variations.pop()
            this.boardVars.pop()
            return false
        }
    }
    /**
     * Update game setup using a new FEN. Only usable before the game has started!
     */
    updateSetup () {
        // Make sure the game was reset before method was called
        if (this.currentBoard.history.length) {
            Log.error("Cannot change game setup after game has started!")
            return
        }
        const fen = this.currentBoard.toFen()
        if (fen !== Fen.DEFAULT_STARTING_STATE) {
            this.headers.set('setup', '1')
            this.headers.set('fen', fen)
            Log.info(`Game has been set up using the fen ${fen}`)
        } else {
            this.headers.remove('setup')
            this.headers.remove('fen')
            Log.info(`Game has been set up using the default starting state`)
        }
    }

    /*
    =======================
    HISTORY METHODS
    =======================
    */

    /**
     * Go to the start of the game (before the first move)
     */
    goToStart () {
        Log.debug("Returning to start of the game.")
        this.selectMove(-1, 0)
    }
    /**
     * Return the list of moves (from game start to currently selected move) in currently active line,
     * returning either Move objects or filtered property
     * @param filter
     * @return
     */
    getMoveHistory (filter: string | null = null) {
        let moveHist = []
        let tmpBoard = this.currentBoard
        // Traverse back in current variation's turn history
        for (let i=tmpBoard.selectedTurnIndex; i>=0; i--) {
            if (filter === 'san') {
                moveHist.push(tmpBoard.history[i].move.wildcard ? Move.WILDCARD_MOVES[0] : tmpBoard.history[i].move.san)
            } else if (filter === 'id') {
                moveHist.push(tmpBoard.history[i].id)
            } else {
                moveHist.push(tmpBoard.history[i])
            }
        }
        // Traverse back in all the possible parent variations' move histories
        // Check that this wasn't the only variation; root variation has null parentBoard
        if (tmpBoard.parentBoard !== null) {
            do {
                // Next parent variation
                let parentBranchTurnIndex = tmpBoard.parentBranchTurnIndex
                let continuation = tmpBoard.continuation
                tmpBoard = tmpBoard.parentBoard
                // Start from the parent variation's last move
                let i = parentBranchTurnIndex as number
                if (!continuation) {
                    i-- // Skip the move the variation started from
                }
                for (; i>= 0; i--) {
                    if (filter === 'san') {
                        moveHist.push(tmpBoard.history[i].move.wildcard ? Move.WILDCARD_MOVES[0] : tmpBoard.history[i].move.san)
                    } else if (filter === 'id') {
                        moveHist.push(tmpBoard.history[i].id)
                    } else {
                        moveHist.push(tmpBoard.history[i])
                    }
                }
            } while (tmpBoard.parentBoard !== null)
        }
        // Flip the history
        return moveHist.reverse()
    }
    /**
     * Go to next move in history
     * @return true on success, false on failure
     */
    nextMove () {
        return this.currentBoard.next()
    }
    /**
     * Go to previous move in history, returning to parent variation if necessary
     * @return true on success, false on failure
     */
    prevMove () {
        // Check if there is a previous move to go to
        if (this.currentBoard.selectedTurnIndex === 0 && this.currentBoard.parentBoard !== null) {
            // We want to go back one step, so we'll use the continuation method for this
            if ((this.currentBoard.continuation && this.returnFromContinuation())
                || (!this.currentBoard.continuation && this.returnFromVariation())
            )
                return true
            else {
                Log.error("Failed to move to previous entry in parent variation.")
                return false
            }
        } else if (this.currentBoard.selectedTurnIndex === -1) {
            Log.debug("Cannot move back in history: Already at start of game.")
            return false
        } else if (this.selectMove(this.currentBoard.selectedTurnIndex - 1)) {
            return true
        } else {
            Log.error("Failed to move to previous entry in variation.")
            return false
        }
    }
    /**
     * Get current board's move index position as [index, historyLength]
     */
    getMoveIndexPosition () {
        return this.currentBoard.getMoveIndexPosition()
    }
    /**
     * Select a move from turn history, adjusting current board state and returning the selected move
     * @param index move index within the target board's turn history
     * @param boardVar id of the target board
     * @return selected move
     */
    selectMove (index: number, boardVar?: number) {
        if (boardVar === undefined || boardVar === this.currentBoard.id) {
            // Default to selecting a move on current board if boardVar is not defined
            return this.currentBoard.selectMove(index)
        } else {
            // I originally had this elaborate function that searched the closest common variation and
            // traversed to the target move through it. I almost got it working, but in the end there were
            // some weird edge case bugs that I couldn't crack, so I opted for this simple solution.
            // Start by going to ... the start
            while (this.currentBoard.id) {
                // If we're not in the root variation, go there
                this.prevMove()
            }
            // If target is in root variation, just go there
            if (boardVar === 0) {
                return this.currentBoard.selectMove(index)
            }
            // Search for brach-off points on the route to the target variation
            let targetVarBranchOffs = []
            for (let i=0; i<this.boardVars.length; i++) {
                if (this.boardVars[i].id === boardVar) {
                    if (this.boardVars[i].id) {
                        let targetVar = this.boardVars[i]
                        while (targetVar.parentBoard !== null) {
                            targetVarBranchOffs.push([targetVar.parentBoard.id, targetVar.parentBranchTurnIndex])
                            targetVar = targetVar.parentBoard
                        }
                    }
                }
            }
            // Catch some extremely unlikely error (probably meaning a regression bug)
            if (!targetVarBranchOffs.length) {
                // Cloudn't find a path
                Log.error("Could not find a path to the target move!")
                return null
            }
            targetVarBranchOffs.reverse() // Start with lowest variation
            const branchPoint = targetVarBranchOffs.shift() as number[] // [boardVar.id, lastMoveIndex]
            if (branchPoint[0]) {
                // First branch-off is not in root variation
                Log.error("Could not find a path to the target move!")
                return null
            }
            this.currentBoard.selectMove(branchPoint[1])
            // Select the right variation
            while (this.currentBoard.id !== boardVar) {
                const moveVars = this.currentBoard.getSelectedTurn().variations
                for (let i=0; i<moveVars.length; i++) {
                    if ((targetVarBranchOffs.length && moveVars[i].id === targetVarBranchOffs[0][0]) ||
                        (!targetVarBranchOffs.length && moveVars[i].id === boardVar)
                    ) {
                        if (moveVars[i].continuation) {
                            this.enterContinuation(i)
                        } else {
                            this.enterVariation(i)
                        }
                        break
                    }
                }
                if (targetVarBranchOffs.length) {
                    this.currentBoard.selectMove(targetVarBranchOffs[0][1] as number)
                    targetVarBranchOffs.shift()
                } else {
                    Log.error("Could not find a path to the target move!")
                    return null
                }
            }
            // Finally select target move
            return this.currentBoard.selectMove(index)
        }
    }

    /*
    =========================
    VARIATION METHODS
    =========================
    */

    /**
     * Enter one of this move's alternate continuations, making the first move of the continuation
     * @param i continuation's index in the list of this move's variations
     * @return the first move of the continuation or false (in case of error)
     */
    enterContinuation (i = 0) {
        if (!this.currentBoard.history.length) {
            // There can't be continuations if there are no moves
            Log.error("Cannot enter new continuation: Current variation has no moves.")
            return false
        }
        const turn = this.currentBoard.getSelectedTurn()
        if (!turn.variations.length) {
            // Move has no child variations
            Log.error("Cannot enter new continuation: Current move has no variations.")
            return false
        } else if (i < 0 || i >= turn.variations.length) {
            // Variation index is out of bounds
            Log.debug(`Cannot enter new continuation: Requested continuation does not exist (${i}).`)
            return false
        } else if (!turn.variations[i].continuation) {
            Log.debug("Requested variation is not a continuation, entering anyway.")
        } else {
            // All good
            Log.debug("Entering new variation.")
        }
        this.currentBoard = turn.variations[i]
        return this.selectMove(0)
    }
    /**
     * Enter one of this move's alternate variations, making the first move of the variation
     * @param i variation's index in the list of selected move's variations
     * @return the first move of the continuation or false (in case of error)
     */
    enterVariation (i = 0) {
        if (!this.currentBoard.history.length) {
            // There can't be variations if there are no moves
            Log.error("Cannot enter new variation: Current variation has no moves.")
            return false
        }
        const turn = this.currentBoard.getSelectedTurn()
        if (!turn.variations.length) {
            // Move has no child variations
            Log.error("Cannot enter new variation: Current move has no variations.")
            return false
        } else if (i < 0 || i >= turn.variations.length) {
            // Variation index is out of bounds
            Log.error(`Cannot enter new variation: Requested cariation does not exist (${i}).`)
            return false
        } else if (turn.variations[i].continuation) {
            Log.debug("Requested variation is a continuation, entering anyway.")
        } else {
            // All good
            Log.debug("Entering new variation.")
        }
        // The child variation starts with this current move undone
        this.currentBoard = turn.variations[i]
        return this.selectMove(0)
    }
    /**
     * Get move variations for currently selected turn.
     * NOTE: This method includes the base move in the list of variations, so index of a variation
     * on the array returned by this method is not equal to its index in the board's variation list.
     * @return move variations (or just [current move] if there are no variations)
     */
    getCurrentMoveVariations () {
        const turn = this.currentBoard.getSelectedTurn()
        if (turn.variations.length) {
            // This turn has move variations, so return those
            const vars = turn.variations.map(
                board => { return {
                    move: board.history[0].move,
                    continuation: board.continuation
                } }
            )
            // Add parent move in front of the list.
            // The reason for adding the base move into the list of variations is that it would require
            // quite a bit of additional checking to find the base move in cases when a variation move
            // is selected (condition below) and all this would have to be done twice.
            vars.unshift({ move: turn.move, continuation: this.currentBoard.continuation })
            return vars
        } else if (this.currentBoard.parentBoard && !this.currentBoard.getMoveIndexPosition()[0]
                    && this.currentBoard.parentBoard
                    .history[this.currentBoard.parentBranchTurnIndex as number].variations
        ) {
            // This move is a variation, so return the parent turn's variations
            const vars = this.currentBoard.parentBoard
                .history[this.currentBoard.parentBranchTurnIndex as number].variations.map
            (
                board => { return { move: board.history[0].move, continuation: this.currentBoard.continuation } }
            )
            // Add parent move in front of the list
            vars.unshift(
                { move: this.currentBoard.parentBoard
                        .history[this.currentBoard.parentBranchTurnIndex as number].move,
                  continuation: this.currentBoard.parentBoard.continuation
                }
            )
            return vars
        } else {
            // Return an empty array
            return []
        }
    }
    /**
     * Return from current continuation, activating the parent variation
     * @return new selected move (the base move of the continuation)
     */
    returnFromContinuation () {
        // Check if there is a variation to return to
        if (this.currentBoard.parentBoard === null) {
            Log.debug("Cannot return from current continuation: Already at root variation.")
            return false
        }
        // Return to branch move index on parent variation
        const branchMoveIndex = this.currentBoard.parentBranchTurnIndex as number
        this.currentBoard = this.currentBoard.parentBoard
        Log.debug(`Returning from current continuation to parent variation move #${branchMoveIndex}.`)
        return this.selectMove(branchMoveIndex)
    }
    /**
     * Return from current variation, activating the parent variation
     * @return new selected move (the base move of the variation)
     */
    returnFromVariation () {
        // Check if there is a variation to return to
        if (this.currentBoard.parentBoard === null) {
            Log.debug("Cannot return from current variation: Already at root variation.")
            return false
        }
        // Return to branch move index on parent variation
        const branchMoveIndex = this.currentBoard.parentBranchTurnIndex as number - 1
        this.currentBoard = this.currentBoard.parentBoard
        Log.debug(`Returning from current variation to parent variation move #${branchMoveIndex}.`)
        return this.selectMove(branchMoveIndex)
    }

    /*
    ===========================
    EXPORTS AND GETTERS
    ===========================
    */

    /**
     * Get game headers
     * @return
     */
    getHeaders () {
        return this.headers
    }
    /**
     * Generate a string representation of the game state
     * @return moves, meta and ASCII monospace reprensetation of the current board position
     */
    toString () {
        // Retrieve PGN move data
        let pgn = this.toPgn({ showHeaders: false })
        // PGN moves should fit on 4 lines beside the ASCII board representation
        let lineWidth = Math.max(80, Math.floor(pgn.length / 4))
        let pgnLines = []
        // Cut PGN move data to fit into line size
        for (let i=0; i<pgn.length;) {
            let start = i
            i += lineWidth
            while (pgn.charAt(i) !== ' ' && i > start) {
                i++
            }
            pgnLines.push(pgn.substring(start, i))
            i++ // Jump over the white space
        }
        let result = ""
        let asciiLines = this.currentBoard.toString().split('\n')
        let meta = ` : (variations: ${this.boardVars.length}, current move: ${this.currentBoard.selectedTurnIndex}/${this.currentBoard.history.length})`
        // generate ascii board graph
        for (let i=0; i<asciiLines.length; i++) {
            result += asciiLines[i]
            // Print metadata on top for black and on bottom for white
            if (this.currentBoard.turn === Color.WHITE) {
                if (i === 9) {
                    result += meta
                }
            } else if (i === 0) {
                result += meta
            }
            // Print PGN move line if we are past the header
            if (i >= 2 && pgnLines.length > i-2) {
                result += "  " + pgnLines[i-2]
            }
            // Print FEN after PGN lines (with an empty line in between)
            if (i >= 4 && pgnLines.length === i-3) {
                result += "  " + this.currentBoard.toFen()
            }
        }
        return result
    }
    /**
     * Return the color whose turn it is to move
     * @return Color.WHITE or Color.BLACK
     */
    whoIsToMove () {
        return this.currentBoard.turn
    }
    /**
     * See if this game has finished.
     * @param strictCheck use strict 3-fold repetition and 50 move rules
     * @returns boolean
     */
    isFinished(strictCheck=false) {
        return this.currentBoard.isFinished(strictCheck)
    }

    /*
    ==================================
    PASS-THROUGH METHODS
    ==================================
    */

    addHeaders(headers: string[][]) {
        this.headers.addHeaders(headers)
    }
    isInCheck() {
        return this.currentBoard.isInCheck()
    }
    isInCheckmate() {
        return this.currentBoard.isInCheckmate()
    }
    isDraw() {
        return this.currentBoard.isDraw()
    }
    hasInsufficientMaterial() {
        return this.currentBoard.hasInsufficientMaterial()
    }
    isInStalemate() {
        return this.currentBoard.isInStalemate()
    }
    hasRepeatedThreefold() {
        return this.currentBoard.hasRepeatedThreefold()
    }
    hasRepeatedFivefold() {
        return this.currentBoard.hasRepeatedFivefold()
    }
    breaks50MoveRule() {
        return this.currentBoard.breaks50MoveRule()
    }
    breaks75MoveRule() {
        return this.currentBoard.breaks75MoveRule()
    }
    // Board state methods
    pieceAt (sqr: string | number) {
        return this.currentBoard.pieceAt(sqr)
    }
    put (piece: Piece, square: number) {
        return this.currentBoard.put(piece, square)
    }
    remove (square: number) {
        return this.currentBoard.remove(square)
    }
    getCapturedPieces (color: string) {
        return this.currentBoard.getCapturedPieces(color)
    }
    getMoves (filter: MethodOptions.Board.getMoves = {}) {
        return this.currentBoard.getMoves(filter)
    }
    // Export methods
    toFen (options: MethodOptions.Board.toFen = {}) {
        return this.currentBoard.toFen(options)
    }
}

export default Game
