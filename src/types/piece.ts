import { PlayerColor } from './color'

export interface ChessPiece {
    key: PieceCode
    type: PieceType
    color: PlayerColor
    symbol: string
    unicode: string
    html: string

    /**
     * Get character symbol for this chess piece.
     * @returns piece text symbol
     */
    toString: () => string
}

export type PieceCode = 'bB' | 'bK' | 'bN' | 'bP' | 'bQ' | 'bR' |
                        'wB' | 'wK' | 'wN' | 'wP' | 'wQ' | 'wR' | ''
export type PieceType = '.' | 'b' | 'k' | 'n' | 'p' | 'q' | 'r'
