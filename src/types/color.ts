
interface PieceColor {
    BLACK: PlayerColor | '~'
    WHITE: PlayerColor | '~'
}

type PlayerColor = 'b' | 'w'

export type { PieceColor, PlayerColor }
