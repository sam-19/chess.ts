// Aaronfi did a lot of testing with color handling, and this simple approach was the most performance efficient

import { PieceColor, PlayerColor } from '../types/color'

/**
 * Chess piece color class to enfoce standard notation.
 */
class Color implements PieceColor {
    static readonly WHITE = 'w'
    static readonly BLACK = 'b'
    static readonly NONE = '~'
    get WHITE (): PlayerColor {
        return Color.WHITE
    }
    get BLACK (): PlayerColor {
        return Color.BLACK
    }
    get NONE () {
        return Color.NONE
    }
    static swap = function (color: string): PlayerColor {
        return (
            color === Color.WHITE ? Color.BLACK
            : Color.WHITE
        )
    }
    constructor () {}
}

export default Color
