import { MoveAnnotation } from "./annotation"
import { ChessBoard } from "./board"
import { PlayerColor } from "./color"
import { MoveFlags } from "./flags"
import { ChessMove } from "./move"

/**
 * A turn includes relevant metadata about the game and board state
 * in addition to the actual move made.
 */
interface ChessTurn {
    annotations: MoveAnnotation[]
    id: string
    fen: string
    move: ChessMove
    castlingRights: { [color: string]: MoveFlags }
    kingPos: { [color: string]: number | null }
    turn: PlayerColor
    enPassantSqr: number | null
    turnNum: number
    halfMoveCount: number
    plyNum: number
    meta: TurnMeta
    variations: ChessBoard[]
    toString: () => string
    inspect: () => string
}
type TurnMeta = {
    moveTime: number
    moveTimeDelta: number
    comments: string
    puzzleSolution: boolean
}
type TurnProperties = {
    annotations?: MoveAnnotation[]
    id: string
    fen: string
    move: ChessMove
    castlingRights: { [color: string]: MoveFlags }
    kingPos: { [color: string]: number | null }
    turn: PlayerColor
    enPassantSqr: number | null
    turnNum: number
    halfMoveCount: number
    plyNum: number
    meta: TurnMeta
    variations?: ChessBoard[]
}
export { ChessTurn, TurnMeta, TurnProperties }
