import Annotation from './annotation.js'
import Board from './board.js'
import Color from './color.js'
import Flags from './flags.js'
import Move from './move.js'
import { ChessTurn, TurnMeta, TurnProperties } from './types/turn.js'
import { PlayerColor } from './types/color.js'
import { BoardSquareIndex } from './types/board.js'

export default class Turn implements ChessTurn {
    // Instance properties
    annotations: Annotation[]
    id: string
    fen: string
    move: Move
    castlingRights: { [color in PlayerColor]: Flags }
    kingPos: { [color in PlayerColor]: BoardSquareIndex | null }
    turn: PlayerColor
    enPassantSqr: BoardSquareIndex | null
    turnNum: number
    halfMoveCount: number
    plyNum: number
    meta: TurnMeta
    variations: Board[]

    constructor (options: TurnProperties) {
        this.id = options.id
        this.fen = options.fen
        this.move = options.move  // Move object
        this.castlingRights = {
            w: options.castlingRights[Color.WHITE],
            b: options.castlingRights[Color.BLACK]
        }
        this.kingPos = {
            w: options.kingPos[Color.WHITE],
            b: options.kingPos[Color.BLACK]
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
