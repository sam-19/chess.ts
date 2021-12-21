import { MoveFlags } from "./flags"
import { ChessPiece } from "./piece"

interface ChessMove {
    algebraic: string | null
    capturedPiece: ChessPiece | null
    dest: number
    fen: string | null
    flags: MoveFlags
    legal: boolean | null
    movedPiece: ChessPiece
    orig: number
    promotionPiece: ChessPiece | null
    san: string | null
    uci: string | null
    wildcard: boolean
    // Possible error string
    error?: string
}

type MoveError = { error?: string }

interface MoveOptions {
    orig: number
    dest: number
    movedPiece: ChessPiece
    capturedPiece: ChessPiece | null
    promotionPiece: ChessPiece | null
    flags: number[]
}

export { ChessMove, MoveError, MoveOptions }
