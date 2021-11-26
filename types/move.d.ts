import { MoveFlags } from "./flags"
import { ChessPiece } from "./piece"

interface ChessMove {
    algebraic: string | null
    capturedPiece: ChessPiece | null
    dest: number | null
    fen: string | null
    flags: MoveFlags | null
    legal: boolean | null
    movedPiece: ChessPiece | null
    orig: number | null
    promotionPiece: ChessPiece | null
    san: string | null
    uci: string | null
    wildcard: boolean
    // Possible error string
    error?: string
}

interface MoveOptions {
    orig: number
    dest: number
    movedPiece: ChessPiece
    capturedPiece: ChessPiece | null
    promotionPiece: ChessPiece | null
    flags: number[]
}

export { ChessMove, MoveOptions }
