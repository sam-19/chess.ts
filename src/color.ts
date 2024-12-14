// Aaronfi did a lot of testing with color handling, and this simple approach was the most performance efficient

import { PieceColor, PlayerColor } from './types/color'

/**
 * Chess piece color class to enforce standard notation.
 */
export default class Color implements PieceColor {
    static readonly WHITE = 'w' as PlayerColor
    static readonly BLACK = 'b' as PlayerColor
    static readonly NONE = '~' as PlayerColor
    get WHITE (): PlayerColor {
        return Color.WHITE
    }
    get BLACK (): PlayerColor {
        return Color.BLACK
    }
    get NONE (): PlayerColor {
        return Color.NONE
    }
    static swap = function (color: string): PlayerColor {
        return (
            color === Color.WHITE 
                    ? Color.BLACK
                    : Color.WHITE
        )
    }
}