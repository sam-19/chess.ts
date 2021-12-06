import Board from './board'
import Color from './color'
import Flags from './flags'
import { ChessTurn, TurnMeta } from '../types/turn'
import { ChessMove } from '../types/move'

class Turn implements ChessTurn {
    // Instance properties
    id: string
    fen: string
    move: ChessMove
    castlingRights: { [color: string]: Flags }
    kingPos: { [color: string]: number | null }
    turn: typeof Color.WHITE | typeof Color.BLACK
    enPassantSqr: number | null
    moveNum: number
    halfMoveCount: number
    plyNum: number
    meta: TurnMeta
    turnAnnotations: string[]
    variations: Board[]

    constructor (options: ChessTurn) {
        this.id = options.id
        this.fen = options.fen,
        this.move = options.move  // Move object
        this.castlingRights = {
            [Color.WHITE]: options.castlingRights[Color.WHITE],
            [Color.BLACK]: options.castlingRights[Color.BLACK]
        }
        this.kingPos = {
            [Color.WHITE]: options.kingPos[Color.WHITE],
            [Color.BLACK]: options.kingPos[Color.BLACK]
        }
        this.turn = options.turn
        this.enPassantSqr = options.enPassantSqr
        this.moveNum = options.moveNum
        this.halfMoveCount = options.halfMoveCount
        this.plyNum = options.plyNum
        this.meta = options.meta // Includes moveTime, comments, and puzzleSolution
        this.turnAnnotations = []
        this.variations = []
    }
    // Give a string representation of this move
    toString () {
        return this.move.algebraic || ''
    }
    // Alias for toString for log output
    inspect () {
        return this.toString()
    }
}

export default Turn
