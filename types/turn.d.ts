import { ChessBoard } from "./board"
import { PieceColor } from "./color"
import { MoveFlags } from "./flags"
import { ChessMove } from "./move"

/**
 * A turn includes relevant metadata about the game and board state
 * in addition to the actual move made.
 */
interface ChessTurn {
    id: string
    fen: string
    move: ChessMove
    castlingRights: { [color: string]: MoveFlags }
    kingPos: { [color: string]: number | null }
    turn: PieceColor["WHITE"] | PieceColor["BLACK"]
    enPassantSqr: number | null
    moveNum: number
    halfMoveCount: number
    plyNum: number
    meta: TurnMeta
    turnAnnotations: string[]
    variations: ChessBoard[]
}
type TurnMeta = {
    moveTime: number
    moveTimeDelta: number
    comments: string
    puzzleSolution: boolean
}
export { ChessTurn, TurnMeta }
