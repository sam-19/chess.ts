import { BoardSquareIndex } from './board'
import { MoveFlags } from "./flags"
import { ChessPiece } from "./piece"

interface ChessMove {
    algebraic: string | null
    capturedPiece: ChessPiece | null
    dest: BoardSquareIndex | -1
    detail: Map<string, string | string[] | number | number[]>
    fen: string | null
    flags: MoveFlags
    legal: boolean | null
    movedPiece: ChessPiece
    orig: BoardSquareIndex | -1
    promotionPiece: ChessPiece | null
    san: string | null
    uci: string | null
    wildcard: boolean
    // Possible error string
    error?: string
}

type MoveError = { error?: string }

interface MoveOptions {
    orig: BoardSquareIndex
    dest: BoardSquareIndex
    detail: { [key: string]: string | string[] | number | number[] }
    movedPiece: ChessPiece
    capturedPiece: ChessPiece | null
    promotionPiece: ChessPiece | null
    flags: number[]
}

export { ChessMove, MoveError, MoveOptions }
