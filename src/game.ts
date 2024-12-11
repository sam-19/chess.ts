import Board from './board'
import Color from './color'
import { Log } from 'scoped-event-log'
import Fen from './fen'
import Headers from './headers'
import Move from './move'
import Options from './options'
import Piece from './piece'
import ChessTimer from './timers'
import Turn from './turn'

import { type ChessGame } from './types/game'
import { type MethodOptions } from './types/options'
import { type PlayerColor } from './types/color'
import { type ChessTurn } from './types/turn'
import { type TCTimeValues } from './types/timers'
import {
    type AnyHeader,
    type GameHeaders,
    type TerminationReason,
} from './types/headers'
import { ChessBoard } from './types'

const SCOPE = 'game'

export default class Game implements ChessGame {
    /**
     * Each player gets their own result code.
     * For example, if white runs out of time but black does not have enough material to deliver a checkmate
     * white gets draw by timeout and black gets draw by insufficient material.
     */
    static readonly RESULT = {
        UNKNOWN: '',
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
    /**
     * Current game state.
     */
    static readonly STATE = {
        SETUP: 'setup',
        READY: 'ready',
        RUNNING: 'running',
        PAUSED: 'paused',
        FINISHED: 'finished',
    }

    active = false
    currentBoard: ChessBoard
    endTime = null as Date | null
    headers: GameHeaders
    pauseTimes = [] as [Date, Date | null][]
    shouldPreserve = false
    startTime = null as Date | null
    timers = new ChessTimer()
    useStrictRules = false
    variations = [] as ChessBoard[]

    constructor (
        fen = Fen.DEFAULT_STARTING_STATE,
        pgnHeaders: [AnyHeader, string][] = []
    ) {
        // Set headers
        this.headers = new Headers(pgnHeaders)
        // Create the first board variation, i.e. the actual game
        if (fen) {
            if (Fen.Validate(fen).isValid) {
                this.currentBoard = new Board(this, fen)
            } else {
                Log.error(`Could not create board from FEN "${fen}", using starting state instead!`, SCOPE)
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
        this.variations = [this.currentBoard]
    }

    /*
     * ======================================================================
     *                             GETTERS
     * ======================================================================
     */

    get annotator () {
        return this.headers.get('Annotator') || null
    }
    set annotator (value: string | null) {
        if (value) {
            this.headers.set('Annotator', value)
        } else {
            this.headers.remove('Annotator')
        }
    }

    get currentMoveVariations () {
        const turn = this.currentBoard.selectedTurn
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
        } else if (this.currentBoard.parentBoard && !this.currentBoard.turnIndexPosition[0]
                    && this.currentBoard.parentBoard
                    .history[this.currentBoard.parentBranchTurnIndex as number].variations
        ) {
            // This move is a variation, so return the parent turn's variations
            const vars = this.currentBoard.parentBoard
                .history[this.currentBoard.parentBranchTurnIndex as number].variations.map(
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
    get date () {
        return this.headers.get('Date') || null
    }
    set date (value: string | null) {
        if (value) {
            this.headers.set('Date', value)
        } else {
            this.headers.remove('Date')
        }
    }

    get eco () {
        return this.headers.get('ECO') || null
    }
    set eco (value: string | null) {
        if (value) {
            this.headers.set('ECO', value)
        } else {
            this.headers.remove('ECO')
        }
    }

    get fen () {
        return this.headers.get('FEN') || null
    }
    set fen (value: string | null) {
        if (value) {
            this.headers.set('FEN', value)
        } else {
            this.headers.remove('FEN')
        }
    }

    get event () {
        return this.headers.get('Event') || null
    }
    set event (value: string | null) {
        if (value) {
            this.headers.set('Event', value)
        } else {
            this.headers.remove('Event')
        }
    }

    get hasEnded () {
        return this.endTime !== null
    }

    get hasStarted () {
        return this.startTime !== null
    }

    get isPaused () {
        return (this.pauseTimes.length > 0 && this.pauseTimes[this.pauseTimes.length - 1][1] === null)
    }

    get isSetUp () {
        return this.headers.get('SetUp') === '1'
    }
    set isSetUp (value: boolean | null) {
        if (value) {
            this.headers.set('SetUp', value ? '1' : '0')
        } else {
            this.headers.remove('SetUp')
        }
    }

    get mode () {
        return this.headers.get('Mode') || null
    }
    set mode (value: string | null) {
        if (value) {
            this.headers.set('Mode', value)
        } else {
            this.headers.remove('Mode')
        }
    }

    get players () {
        const _this = this // Access parent class in getters and setters.
        const value = {
            get b () {
                const black = {
                    get elo () {
                        return parseInt(_this.headers.get('BlackElo') || '0') || null
                    },
                    set elo (value: number | null) {
                        if (value !== null) {
                            _this.headers.set('BlackElo', value.toString())
                        } else {
                            _this.headers.remove('BlackElo')
                        }
                    },
                    get name () {
                        return _this.headers.get('Black') || null
                    },
                    set name (value: string | null) {
                        if (value !== null) {
                            _this.headers.set('Black', value.toString())
                        } else {
                            _this.headers.remove('Black')
                        }
                    },
                    get title () {
                        return _this.headers.get('BlackTitle') || null
                    },
                    set title (value: string | null) {
                        if (value !== null) {
                            _this.headers.set('BlackTitle', value.toString())
                        } else {
                            _this.headers.remove('BlackTitle')
                        }
                    },
                    get type () {
                        return _this.headers.get('BlackType') || null
                    },
                    set type (value: string | null) {
                        if (value !== null) {
                            _this.headers.set('BlackType', value.toString())
                        } else {
                            _this.headers.remove('BlackType')
                        }
                    },
                }
                return black
            },
            set b (value: ChessGame['players']['b']) {
                if (value.elo) {
                    _this.headers.set('BlackElo', value.elo.toString())
                } else {
                    _this.headers.remove('BlackElo')
                }
                if (value.name) {
                    _this.headers.set('Black', value.name)
                } else {
                    _this.headers.remove('Black')
                }
                if (value.title) {
                    _this.headers.set('BlackTitle', value.title)
                } else {
                    _this.headers.remove('BlackTitle')
                }
                if (value.type) {
                    _this.headers.set('BlackType', value.type)
                } else {
                    _this.headers.remove('BlackType')
                }
            },
            get w () {
                const white = {
                    get elo () {
                        return parseInt(_this.headers.get('WhiteElo') || '0') || null
                    },
                    set elo (value: number | null) {
                        if (value !== null) {
                            _this.headers.set('WhiteElo', value.toString())
                        } else {
                            _this.headers.remove('WhiteElo')
                        }
                    },
                    get name () {
                        return _this.headers.get('White') || null
                    },
                    set name (value: string | null) {
                        if (value !== null) {
                            _this.headers.set('White', value.toString())
                        } else {
                            _this.headers.remove('White')
                        }
                    },
                    get title () {
                        return _this.headers.get('WhiteTitle') || null
                    },
                    set title (value: string | null) {
                        if (value !== null) {
                            _this.headers.set('WhiteTitle', value.toString())
                        } else {
                            _this.headers.remove('WhiteTitle')
                        }
                    },
                    get type () {
                        return _this.headers.get('WhiteType') || null
                    },
                    set type (value: string | null) {
                        if (value !== null) {
                            _this.headers.set('WhiteType', value.toString())
                        } else {
                            _this.headers.remove('WhiteType')
                        }
                    },
                }
                return white
            },
            set w (value: ChessGame['players']['w']) {
                if (value.elo) {
                    _this.headers.set('WhiteElo', value.elo.toString())
                } else {
                    _this.headers.remove('WhiteElo')
                }
                if (value.name) {
                    _this.headers.set('White', value.name)
                } else {
                    _this.headers.remove('White')
                }
                if (value.title) {
                    _this.headers.set('WhiteTitle', value.title)
                } else {
                    _this.headers.remove('WhiteTitle')
                }
                if (value.type) {
                    _this.headers.set('WhiteType', value.type)
                } else {
                    _this.headers.remove('WhiteType')
                }
            },
        } as ChessGame['players']
        return value
    }

    get plyCount () {
        const ply = this.headers.get('PlyCount')
        return ply !== undefined ? parseInt(ply) : null
    }
    set plyCount (value: number | null) {
        if (value) {
            this.headers.set('PlyCount', value.toFixed())
        } else {
            this.headers.remove('PlyCOunt')
        }
    }

    get result () {
        return this.headers.get('Result') || null
    }
    set result (value: string | null) {
        if (value) {
            this.headers.set('Result', value)
        } else {
            this.headers.remove('Result')
        }
    }

    get round () {
        const round = this.headers.get('Round')
        return round !== undefined ? parseInt(round) : null
    }
    set round (value: number | null) {
        if (value) {
            this.headers.set('Round', value.toFixed())
        } else {
            this.headers.remove('Round')
        }
    }

    get site () {
        return this.headers.get('Site') || null
    }
    set site (value: string | null) {
        if (value) {
            this.headers.set('Site', value)
        } else {
            this.headers.remove('Site')
        }
    }

    get termination () {
        return this.headers.get('Termination') as TerminationReason || null
    }
    set termination (value: TerminationReason | null) {
        if (value) {
            this.headers.set('Termination', value)
        } else {
            this.headers.remove('Termination')
        }
    }

    get time () {
        return this.headers.get('Time') || null
    }
    set time (value: string | null) {
        if (value) {
            this.headers.set('Time', value)
        } else {
            this.headers.remove('Time')
        }
    }

    get timeControl () {
        return this.headers.get('TimeControl') || null
    }
    set timeControl (value: string | null) {
        if (value) {
            this.headers.set('TimeControl', value)
        } else {
            this.headers.remove('TimeControl')
        }
    }

    get turnIndexPosition () {
        return this.currentBoard.turnIndexPosition
    }

    get utcDate () {
        return this.headers.get('UTCDate') || null
    }
    set utcDate (value: string | null) {
        if (value) {
            this.headers.set('UTCDate', value)
        } else {
            this.headers.remove('UTCDate')
        }
    }

    get utcTime () {
        return this.headers.get('UTCTime') || null
    }
    set utcTime (value: string | null) {
        if (value) {
            this.headers.set('UTCTime', value)
        } else {
            this.headers.remove('UTCTime')
        }
    }


    /*
     * ======================================================================
     *                             METHODS
     * ======================================================================
     */

    addTimeControl (tc: typeof ChessTimer.FieldModel) {
        if (!this.hasStarted) {
            if (this.timers === null) {
                this.timers = new ChessTimer()
            }
            this.timers.addField(tc)
        }
    }

    continue () {
        // Check that game is ongoing and that it is paused
        if (this.hasStarted && !this.hasEnded && this.isPaused) {
            // Make sure pause timestamps are in sync
            const timestamp = new Date()
            this.pauseTimes[this.pauseTimes.length - 1][1] = timestamp
            if (this.timers !== null) {
                this.timers.continueTimer(timestamp.getTime())
            }
        }
    }

    createContinuationFromSan (san: string) {
        return this.createVariationFromSan(san, true)
    }

    createVariationFromSan (san: string, continuation=false) {
        // Check that a SAN string is given
        if (san === undefined || san === null || san === "") {
            Log.error(`Failed to create a new variation/continuation from SAN (${san}): Invalid input.`, SCOPE)
            return false
        }
        const addition = (continuation ? 1 : 0)
        // Check that we have not reached the end of the current variation
        if (this.currentBoard.selectedTurnIndex < this.currentBoard.history.length - addition) {
            // Check that the given SAN is really generating a new variation
            if (san === this.currentBoard.history[this.currentBoard.selectedTurnIndex + addition].move.san) {
                Log.debug(`Did not create a new variation from SAN (${san}): Move matches the next move in current variation.`, SCOPE)
                return false
            } else if (Move.WILDCARD_MOVES.indexOf(san) !== -1) {
                if (!continuation) {
                    Log.error(`Did not create a new variation from SAN (${san}): Cannot start a new variation with a wilcard move.`, SCOPE)
                    return false
                } // TODO: Continuation can be started with a wilcard move, but does this require extra handling?
            }
        } else {
            Log.warn(`Cannot create a new variation from SAN (${san}): Already at the end of current variation.`, SCOPE)
            return false
        }
        // Create the new variation
        const newBoard = Board.branchFromParent(this.currentBoard, { continuation: continuation })
        this.currentBoard.history[this.currentBoard.selectedTurnIndex].variations.push(newBoard)
        this.currentBoard = newBoard
        const move = Move.generateFromSan(san, this.currentBoard)
        if (!Object.prototype.hasOwnProperty.call(move, 'error')) {
            // Check that we can make this move
            if (this.currentBoard.makeMove(move as Move)) {
                if (continuation) {
                    Log.debug(`New (continuation) variation started from SAN: ${san}`, SCOPE)
                } else {
                    Log.debug(`New variation started from SAN: ${san}`, SCOPE)
                }
                return true
            } else {
                return false
            }
        } else {
            Log.error(`Could not create a new variation from SAN: ${move.error}`, SCOPE)
            // Return to parent variation and remove new variation from its child variations
            this.currentBoard = this.currentBoard.parentBoard as Board
            this.currentBoard.history[this.currentBoard.selectedTurnIndex].variations.pop()
            this.variations.pop()
            return false
        }
    }

    end (result = '1/2-1/2') {
        if (this.startTime !== null && this.endTime === null) {
            const timestamp = new Date()
            this.endTime = timestamp
            if (this.timers !== null) {
                this.timers.stopTimer(timestamp.getTime())
            }
            // Remove all possible white spaces from the result string
            result = result.replaceAll(/\s+/g, '')
            this.headers.set('result', result)
        }
    }

    enterContinuation (i = 0) {
        if (!this.currentBoard.history.length) {
            // There can't be continuations if there are no moves
            Log.error("Cannot enter new continuation: Current variation has no moves.", SCOPE)
            return false
        }
        const turn = this.currentBoard.selectedTurn
        if (!turn.variations.length) {
            // Move has no child variations
            Log.error("Cannot enter new continuation: Current move has no variations.", SCOPE)
            return false
        } else if (i < 0 || i >= turn.variations.length) {
            // Variation index is out of bounds
            Log.debug(`Cannot enter new continuation: Requested continuation does not exist (${i}).`, SCOPE)
            return false
        } else if (!turn.variations[i].continuation) {
            Log.debug("Requested variation is not a continuation, entering anyway.", SCOPE)
        } else {
            // All good
            Log.debug("Entering new variation.", SCOPE)
        }
        this.currentBoard = turn.variations[i]
        return this.selectTurn(0)
    }

    enterVariation (i = 0) {
        if (!this.currentBoard.history.length) {
            // There can't be variations if there are no moves
            Log.error("Cannot enter new variation: Current variation has no moves.", SCOPE)
            return false
        }
        const turn = this.currentBoard.selectedTurn
        if (!turn.variations.length) {
            // Move has no child variations
            Log.error("Cannot enter new variation: Current move has no variations.", SCOPE)
            return false
        } else if (i < 0 || i >= turn.variations.length) {
            // Variation index is out of bounds
            Log.error(`Cannot enter new variation: Requested cariation does not exist (${i}).`, SCOPE)
            return false
        } else if (turn.variations[i].continuation) {
            Log.debug("Requested variation is a continuation, entering anyway.", SCOPE)
        } else {
            // All good
            Log.debug("Entering new variation.", SCOPE)
        }
        // The child variation starts with this current move undone
        this.currentBoard = turn.variations[i]
        return this.selectTurn(0)
    }

    getCapturedPieces (color: PlayerColor, opts: MethodOptions.Game.getCapturedPieces = {}) {
        const options = Options.Game.getCapturedPieces().assign(opts) as MethodOptions.Game.getCapturedPieces
        let pieceList = []
        const gameHistory = this.getMoveHistory() as Turn[]
        for (const turn of gameHistory) {
            if (!turn.move.capturedPiece) {
                continue
            }
            if (turn.move.capturedPiece.type !== Piece.TYPE_NONE && turn.move.capturedPiece.color === color) {
                pieceList.push(turn.move.capturedPiece)
            }
        }
        // Custom sorting of captured pieces, in the order Queen > Rook > Bishop > Knight > Pawn
        pieceList.sort(function(a, b) {
            if (a === b) {
                return 0
            } else if (a.type === Piece.TYPE_QUEEN) {
                return -1
            } else if (a.type === Piece.TYPE_ROOK && b.type !== Piece.TYPE_QUEEN) {
                return -1
            } else if (a.type === Piece.TYPE_BISHOP && b.type !== Piece.TYPE_QUEEN && b.type !== Piece.TYPE_ROOK) {
                return -1
            } else if (a.type === Piece.TYPE_KNIGHT && b.type === Piece.TYPE_PAWN) {
                return -1
            } else {
                return 1
            }
        })
        if (options.onlyType) {
            pieceList = pieceList.map(piece => piece.type)
        }
        return pieceList
    }

    getMoveHistory (filter?: string) {
        const moveHist = [] as (ChessTurn | string)[]
        let tmpBoard = this.currentBoard
        // Traverse back in current variation's turn history
        for (let i=tmpBoard.selectedTurnIndex; i>=0; i--) {
            if (filter === 'san') {
                moveHist.push(tmpBoard.history[i].move.wildcard
                    ? Move.WILDCARD_MOVES[0]
                    : tmpBoard.history[i].move.san as string
                )
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
                const parentBranchTurnIndex = tmpBoard.parentBranchTurnIndex
                const continuation = tmpBoard.continuation
                tmpBoard = tmpBoard.parentBoard
                // Start from the parent variation's last move
                let i = parentBranchTurnIndex as number
                if (!continuation) {
                    i-- // Skip the move the variation started from
                }
                for (; i>= 0; i--) {
                    if (filter === 'san') {
                        moveHist.push(tmpBoard.history[i].move.wildcard
                            ? Move.WILDCARD_MOVES[0]
                            : tmpBoard.history[i].move.san as string
                        )
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

    goToStart () {
        Log.debug("Returning to start of the game.", SCOPE)
        this.selectTurn(-1, 0)
    }

    loadFen (fen: string) {
        const newBoard = new Board(this, fen)
        this.currentBoard = newBoard
        this.updateSetup()
        // Reset board variations
        this.variations = [newBoard]
    }

    makeMove (move: Move, opts: MethodOptions.Game.makeMove = {}) {
        const options = Options.Game.makeMove().assign(opts) as MethodOptions.Game.makeMove
        // Update time controls if need be
        if (this.timers) {
            this.timers.moveMade(this.currentBoard.plyNum, options.takeback)
        }
        if (!options.branchVariation) {
            // TODO: Right now this check is done twice, because Board.makeMove() checks for it too
            const { isNew, contIdx, varIdx } = this.currentBoard.isNewMove(move)
            if (isNew) {
                const newVar = this.moveHistoryToNewVariation()
                if (newVar) {
                    const newMove = this.currentBoard.makeMove(move, options)
                    if (!Object.prototype.hasOwnProperty.call(newMove, 'error')) {
                        (newMove as Turn).variations.push(newVar)
                    }
                    return newMove
                }
            } else {
                const curMoveIdx = this.currentBoard.turnIndexPosition[0]
                const matchingVar = contIdx !== -1 ? this.currentBoard.selectedTurn.variations.splice(contIdx, 1)[0]
                                    : varIdx !== -1 ? this.currentBoard.history[curMoveIdx + 1].variations.splice(varIdx, 1)[0]
                                    : { history: [] }
                // We will save the old history as a continuation for consistency
                // (so it remains a branch of the same move as the matching variation/continuation)
                if (this.moveHistoryToNewContinuation()) {
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
                    Log.error("Failed to move current history into a new continuation!", SCOPE)
                }
            }
        }
        // Preserve a game after first move, if it was made by a player or otherwise is flagged for preservation
        if (!this.shouldPreserve && (options.isPlayerMove || options.preserveGame)) {
            this.shouldPreserve = true
        }
        const turn = this.currentBoard.makeMove(move, options)
        // Handle possible game end in root variation
        const endState = this.currentBoard.endState
        if (!this.currentBoard.id && endState.headers !== '*') {
            this.end(endState.headers)
        }
        return turn
    }

    makeMoveFromAlgebraic (orig: string, dest: string, options: MethodOptions.Game.makeMove = {}) {
        const move = Move.generateFromAlgebraic(orig, dest, this.currentBoard)
        if (move.error !== undefined) {
            Log.error(`Cound not make move from algebraic (${orig}-${dest}): ${move.error}`, SCOPE)
            return move
        }
        Log.debug(`Making a move from algebraic: ${orig}-${dest}.`, SCOPE)
        return this.makeMove(move as Move, options)
    }

    makeMoveFromSan (san: string, options: MethodOptions.Game.makeMove = {}) {
        const move = Move.generateFromSan(san, this.currentBoard)
        if (Object.prototype.hasOwnProperty.call(move, 'error')) {
            Log.error(`Cound not make move from SAN (${san}): ${move.error}`, SCOPE)
            return move as { error: string }
        }
        Log.debug(`Making a move from SAN: ${san}.`, SCOPE)
        return this.makeMove(move as Move, options)
    }

    moveHistoryToNewContinuation () {
        const movePos = this.currentBoard.turnIndexPosition
        if (movePos[0] === movePos[1] - 1) {
            // Already at the end of current board's turn history
            return false
        }
        // This move has already been played. In order to not branch a new variation, we have to move
        // all subsequent moves to a new variation and continue on the current board.
        this.currentBoard.selectTurn(movePos[0])
        const futureTurns = this.currentBoard.history.splice(movePos[0] + 1)
        const newVariation = Board.branchFromParent(this.currentBoard, { continuation: true })
        for (let i=0; i<futureTurns.length; i++) {
            if (futureTurns[i].variations) {
                for (let j=0; j<futureTurns[i].variations.length; j++) {
                    // Update possible parent variations and branch points for variations for relocated moves
                    futureTurns[i].variations[j].parentBoard = newVariation
                    futureTurns[i].variations[j].parentBranchTurnIndex = i
                }
            }
        }
        this.currentBoard.selectedTurn.variations.push(newVariation)
        newVariation.history = futureTurns
        return true
    }

    moveHistoryToNewVariation (newTurn?: Turn) {
        const movePos = this.currentBoard.turnIndexPosition
        if (movePos[0] === movePos[1] - 1) {
            // Already at the end of current board's turn history
            return false
        }
        // This move has already been played. In order to not branch a new variation, we have to move
        // all subsequent moves to a new variation and continue on the current board.
        // The old history will be added as a variation of the new move that follows the selected turn.
        this.currentBoard.selectTurn(movePos[0])
        const futureTurns = this.currentBoard.history.splice(movePos[0] + 1)
        const newVariation = Board.branchFromParent(this.currentBoard, { continuation: false })
        for (let i=0; i<futureTurns.length; i++) {
            if (futureTurns[i].variations) {
                for (let j=0; j<futureTurns[i].variations.length; j++) {
                    // Update possible parent variations and branch points for variations for relocated moves
                    futureTurns[i].variations[j].parentBoard = newVariation
                    futureTurns[i].variations[j].parentBranchTurnIndex = i
                }
            }
        }
        if (newTurn) {
            newTurn.variations.push(newVariation)
        }
        newVariation.history = futureTurns
        return newVariation
    }

    nextTurn () {
        return this.currentBoard.nextTurn()
    }

    pause () {
        // Check that game is ongoing and that it isn't paused already
        if (this.hasStarted && !this.hasEnded && !this.isPaused) {
            // Make sure pause timestamps are in sync
            const timestamp = new Date()
            this.pauseTimes.push([timestamp, null])
            if (this.timers !== null) {
                this.timers.pauseTimer(timestamp.getTime())
            }
        }
    }

    prevTurn () {
        // Check if there is a previous move to go to
        if (this.currentBoard.selectedTurnIndex === 0 && this.currentBoard.parentBoard !== null) {
            // We want to go back one step, so we'll use the continuation method for this
            if ((this.currentBoard.continuation && this.returnFromContinuation())
                || (!this.currentBoard.continuation && this.returnFromVariation())
            )
                return true
            else {
                Log.error("Failed to move to previous entry in parent variation.", SCOPE)
                return false
            }
        } else if (this.currentBoard.selectedTurnIndex === -1) {
            Log.debug("Cannot move back in history: Already at start of game.", SCOPE)
            return false
        } else if (this.selectTurn(this.currentBoard.selectedTurnIndex - 1)) {
            return true
        } else {
            Log.error("Failed to move to previous entry in variation.", SCOPE)
            return false
        }
    }

    returnFromContinuation () {
        // Check if there is a variation to return to
        if (this.currentBoard.parentBoard === null) {
            Log.debug("Cannot return from current continuation: Already at root variation.", SCOPE)
            return false
        }
        // Return to branch move index on parent variation
        const branchTurnIndex = this.currentBoard.parentBranchTurnIndex as number
        this.currentBoard = this.currentBoard.parentBoard
        Log.debug(`Returning from current continuation to parent variation move #${branchTurnIndex}.`, SCOPE)
        return this.selectTurn(branchTurnIndex)
    }

    returnFromVariation () {
        // Check if there is a variation to return to
        if (this.currentBoard.parentBoard === null) {
            Log.debug("Cannot return from current variation: Already at root variation.", SCOPE)
            return false
        }
        // Return to branch move index on parent variation
        const branchTurnIndex = (this.currentBoard.parentBranchTurnIndex as number) - 1
        this.currentBoard = this.currentBoard.parentBoard
        Log.debug(`Returning from current variation to parent variation move #${branchTurnIndex}.`, SCOPE)
        return this.selectTurn(branchTurnIndex)
    }

    selectTurn (index: number, boardVar?: number) {
        if (boardVar === undefined || boardVar === this.currentBoard.id) {
            // Default to selecting a move on current board if boardVar is not defined
            return this.currentBoard.selectTurn(index)
        } else {
            // I originally had this elaborate function that searched the closest common variation and
            // traversed to the target move through it. I almost got it working, but in the end there were
            // some weird edge case bugs that I couldn't crack, so I opted for this simple solution.
            // Start by going to ... the start
            while (this.currentBoard.parentBoard) {
                // If we're not in the root variation, go there
                if (!this.prevTurn()) {
                    Log.error(`Could not select previous turn while tracing back to root board.`, SCOPE)
                    break
                }
            }
            // If target is in root variation, just go there
            if (boardVar === 0) {
                return this.currentBoard.selectTurn(index)
            }
            // Search for brach-off points on the route to the target variation
            const targetVarBranchOffs = [] as number[][]
            for (let i=0; i<this.variations.length; i++) {
                if (this.variations[i].id === boardVar) {
                    if (this.variations[i].id) {
                        let targetVar = this.variations[i]
                        while (targetVar.parentBoard !== null) {
                            targetVarBranchOffs.push([targetVar.parentBoard.id, targetVar.parentBranchTurnIndex as number])
                            targetVar = targetVar.parentBoard
                        }
                    }
                }
            }
            // Catch some extremely unlikely error (probably meaning a regression bug)
            if (!targetVarBranchOffs.length) {
                // Cloudn't find a path
                Log.error("Could not find a path to the target move (empty trail)!", SCOPE)
                return false
            }
            targetVarBranchOffs.reverse() // Start with lowest variation
            const branchPoint = targetVarBranchOffs.shift() as number[] // [boardVar.id, lastMoveIndex]
            if (branchPoint[0]) {
                // First branch-off is not in root variation
                Log.error("Could not find a path to the target move (didn't start from root)!", SCOPE)
                return false
            }
            this.currentBoard.selectTurn(branchPoint[1])
            // Select the right variation
            while (this.currentBoard.id !== boardVar) {
                const moveVars = this.currentBoard.selectedTurn.variations
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
                    if (targetVarBranchOffs[0][1]) {
                        this.currentBoard.selectTurn(targetVarBranchOffs[0][1] as number)
                    }
                    targetVarBranchOffs.shift()
                } else if (this.currentBoard.id !== boardVar) {
                    Log.error("Could not find a path to the target move (dead end)!", SCOPE)
                    return false
                }
            }
            // Finally select target move
            return this.currentBoard.selectTurn(index)
        }
    }

    setTimeControlFromPgn (tc: string) {
        if (!this.hasStarted) {
            if (this.timers === null) {
                this.timers = new ChessTimer()
            }
            this.timers.parseTimeControlString(tc)
        }
    }

    setTimerReportFunction (f: ((timers: TCTimeValues) => void) | null) {
        if (!this.hasStarted) {
            this.timers.setReportFunction(f)
        }
    }

    start () {
        if (!this.currentBoard) {
            return false
        }
        if (this.timers && this.timers.getReportFunction() === null) {
            Log.error("Cannot start game before time control report function is set!", SCOPE)
            return false
        }
        if (!this.hasStarted) {
            this.startTime = new Date()
            if (this.timers !== null) {
                if (this.currentBoard.plyNum !== 1) {
                    this.timers.setPlyNum(this.currentBoard.plyNum)
                }
                this.timers.startTimer()
            }
            // Preserve started game
            this.shouldPreserve = true
            return true
        }
        return false
    }

    toPgn (options={} as MethodOptions.Game.toPgn) {
        options = Options.Game.toPgn().assign(options) as MethodOptions.Game.toPgn
        const pgnHeaders = []
        // Start by adding headers
        if (options.showHeaders) {
            for (let i=0; i<this.headers.length(); i++) {
                pgnHeaders.push(`[${this.headers.getKey(i)} "${this.headers.getValue(i)}"]`)
            }
            // Add empty line after headers
            if (this.headers.length())
                pgnHeaders.push("")
        }
        const rootVar = this.variations[0]
        const pgnMoves = processVariation(rootVar, 1, this.currentBoard)
        // Auxiliary function to process the variations
        function processVariation (variation: Board, moveNum: number, currentBoard: Board) {
            const varMoves = [] as string[]
            let varMoveStr = ""
            let firstMove = true
            let lastMove = false
            for (let i=0; i<variation.history.length; i++) {
                const turn = variation.history[i]
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
                if (turn.annotations.length) {
                    varMoves.push('{' + turn.annotations.join('}{') + '}')
                }
                // Add variations
                if (variation.history[i].variations.length) {
                    // Add possible annotation at the start of child variation
                    for (let j=0; j<variation.history[i].variations.length; j++) {
                        const childVar = variation.history[i].variations[j]
                        const childVarMoves = processVariation(childVar, moveNum - (childVar.continuation ? 0 : 1), currentBoard)
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
            const wrappedLines = [""]
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

    updateSetup () {
        // Make sure the game was reset before method was called
        if (this.currentBoard.history.length) {
            Log.error("Cannot change game setup after game has started!", SCOPE)
            return
        }
        const fen = this.currentBoard.toFen()
        if (fen !== Fen.DEFAULT_STARTING_STATE) {
            this.headers.set('setup', '1')
            this.headers.set('fen', fen)
            Log.info(`Game has been set up using the fen ${fen}`, SCOPE)
        } else {
            this.headers.remove('setup')
            this.headers.remove('fen')
            Log.info(`Game has been set up using the default starting state`, SCOPE)
        }
    }

    toString () {
        // Retrieve PGN move data
        const pgn = this.toPgn({ showHeaders: false }).split('\n').join(' ')
        // PGN moves should fit on 4 lines beside the ASCII board representation
        const lineWidth = Math.max(80, Math.floor(pgn.length / 4))
        const pgnLines = []
        // Cut PGN move data to fit into line size
        for (let i=0; i<pgn.length;) {
            const start = i
            i += lineWidth
            // Check if the rest of the PGN can be fit on this line
            if (i >= pgn.length) {
                pgnLines.push(pgn.substring(start))
                break
            }
            // Otherwise, trace back to the next white space and cut there
            while (pgn.charAt(i) !== ' ' && i > start) {
                i--
            }
            pgnLines.push(pgn.substring(start, i))
            i++ // Jump over the white space
        }
        let result = ""
        const asciiLines = this.currentBoard.toString().split('\n')
        // generate ascii board graph
        for (let i=0; i<asciiLines.length; i++) {
            result += asciiLines[i]
            // Print metadata on top for black and on bottom for white
            if (this.currentBoard.turn === Color.WHITE) {
                if (i === 9) {
                    result
                }
            } else if (i === 0) {
                result
            }
            // Print PGN move line if we are past the header
            if (i >= 2 && pgnLines.length > i-2) {
                result += "  " + pgnLines[i-2]
            }
            // Print FEN after PGN lines (with an empty line in between)
            if (i >= 4 && pgnLines.length === i-3) {
                result += "  " + this.currentBoard.toFen()
            }
            if (i < asciiLines.length - 1) {
                result += '\n'
            }
        }
        return result
    }

    /*
     * ======================================================================
     *                          PASS-THROUGHS
     * ======================================================================
     */

    get breaks50MoveRule () {
        return this.currentBoard.breaks50MoveRule
    }
    get breaks75MoveRule () {
        return this.currentBoard.breaks75MoveRule
    }
    get endState () {
        return this.variations[0].endState
    }
    get hasInsufficientMaterial () {
        return this.currentBoard.hasInsufficientMaterial
    }
    get hasRepeatedThreefold () {
        return this.currentBoard.hasRepeatedThreefold
    }
    get hasRepeatedFivefold () {
        return this.currentBoard.hasRepeatedFivefold
    }
    get isFinished () {
        return this.currentBoard.isFinished
    }
    get isInCheck () {
        return this.currentBoard.isInCheck
    }
    get isInCheckmate () {
        return this.currentBoard.isInCheckmate
    }
    get isDraw () {
        return this.currentBoard.isDraw
    }
    get isInStalemate () {
        return this.currentBoard.isInStalemate
    }
    get playerToMove () {
        return this.currentBoard.turn
    }
    addHeaders(headers: string[][]) {
        this.headers.add(headers)
    }
    getMoves (filter: MethodOptions.Board.getMoves = {}) {
        return this.currentBoard.getMoves(filter)
    }
    pieceAt (sqr: string | number) {
        return this.currentBoard.pieceAt(sqr)
    }
    placePiece (piece: Piece, square: number | string) {
        return this.currentBoard.placePiece(piece, square)
    }
    removePiece (square: number | string) {
        return this.currentBoard.removePiece(square)
    }
    toFen (options: MethodOptions.Board.toFen = {}) {
        return this.currentBoard.toFen(options)
    }
}