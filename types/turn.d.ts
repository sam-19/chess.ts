import { MoveAnnotation } from "./annotation"
import { ChessBoard } from "./board"
import { PlayerColor } from "./color"
import { MoveFlags } from "./flags"
import { ChessMove } from "./move"

/**
 * A turn includes relevant information about the game and board state
 * in addition to the actual move made.
 */
interface ChessTurn {
    /**
     * List of annotations associated with this turn.
     */
    annotations: MoveAnnotation[]
    /**
     * Unique ID.
     */
    id: string
    /**
     * FEN representation of the game state after this turn.
     */
    fen: string
    /**
     * The move associated with this turn.
     */
    move: ChessMove
    /**
     * Remaining castling rights after this turn.
     */
    castlingRights: { [color: string]: MoveFlags }
    /**
     * King positions after this turn.
     */
    kingPos: { [color: string]: number | null }
    /**
     * Player whose turn this was.
     */
    turn: PlayerColor
    /**
     * Possible en passant square after this turn.
     */
    enPassantSqr: number | null
    /**
     * Running number associated with this turn (for PGN).
     */
    turnNum: number
    /**
     * Number of half moves after last capture/pawn move.
     */
    halfMoveCount: number
    /**
     * Ply number at the start of this turn.
     */
    plyNum: number
    /**
     * Possible additional metadata associated with this turn.
     */
    meta: TurnMeta
    /**
     * Move variations associated with this turn.
     */
    variations: ChessBoard[]
    /**
     * Algebraic representation of the move associated with this turn.
     */
    toString: () => string
    /**
     * Alias of toString().
     */
    inspect: () => string
}

/**
 * Turn metadata.
 */
type TurnMeta = {
    /**
     * Absolute time when the move associated with this turn was made.
     */
    moveTime: number
    /**
     * Time between this move and the previous move.
     */
    moveTimeDelta: number
    /**
     * Possible comments.
     */
    comments: string
    /**
     * Does this move represent a puzzle solution.
     */
    puzzleSolution: boolean
}

/**
 * Properties needed to construct a new turn.
 */
type TurnProperties = {
    /**
     * List of annotations associated with this turn.
     */
    annotations?: MoveAnnotation[]
    /**
     * Unique ID.
     */
    id: string
    /**
     * FEN representation of the game state after this turn.
     */
    fen: string
    /**
     * The move associated with this turn.
     */
    move: ChessMove
    /**
     * Remaining castling rights after this turn.
     */
    castlingRights: { [color: string]: MoveFlags }
    /**
     * King positions after this turn.
     */
    kingPos: { [color: string]: number | null }
    /**
     * Player whose turn this was.
     */
    turn: PlayerColor
    /**
     * Possible en passant square after this turn.
     */
    enPassantSqr: number | null
    /**
     * Running number associated with this turn (for PGN).
     */
    turnNum: number
    /**
     * Number of half moves after last capture/pawn move.
     */
    halfMoveCount: number
    /**
     * Ply number at the start of this turn.
     */
    plyNum: number
    /**
     * Possible additional metadata associated with this turn.
     */
    meta: TurnMeta
    /**
     * Move variations associated with this turn.
     */
    variations?: ChessBoard[]
}
export { ChessTurn, TurnMeta, TurnProperties }
