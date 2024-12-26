
interface PieceColor {
    BLACK: PlayerColor | '~'
    WHITE: PlayerColor | '~'
}

type PlayerColor = 'b' | 'w'

export { PieceColor, PlayerColor }
