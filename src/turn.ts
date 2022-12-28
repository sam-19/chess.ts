import Annotation from './annotation'
import Board from './board'
import Color from './color'
import Flags from './flags'
import Move from './move'
import { ChessTurn, TurnMeta, TurnProperties } from '../types/turn'
import { PlayerColor } from '../types/color'

class Turn implements ChessTurn {
    // Instance properties
    annotations: Annotation[]
    id: string
    fen: string
    move: Move
    castlingRights: { [color: string]: Flags }
    kingPos: { [color: string]: number | null }
    turn: PlayerColor
    enPassantSqr: number | null
    turnNum: number
    halfMoveCount: number
    plyNum: number
    meta: TurnMeta
    variations: Board[]

    constructor (options: TurnProperties) {
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
        this.turnNum = options.turnNum
        this.halfMoveCount = options.halfMoveCount
        this.plyNum = options.plyNum
        this.meta = options.meta // Includes moveTime, comments, and puzzleSolution
        this.annotations = options.annotations || []
        this.variations = options.variations || []
    }

    toString () {
        return this.move.algebraic || ''
    }
}

export default Turn
