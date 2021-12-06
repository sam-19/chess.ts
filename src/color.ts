// Aaronfi did a lot of testing with color handling, and this simple approach was the most performance efficient

import { PieceColor } from '../types/color'

/**
 * Chess piece color class to enfoce standard notation.
 */
class Color implements PieceColor {
    static readonly WHITE = 'w' as 'w'
    static readonly BLACK = 'b' as 'b'
    static readonly NONE = '~' as '~'
    get WHITE () {
        return Color.WHITE
    } 
    get BLACK () {
        return Color.BLACK
    } 
    get NONE () {
        return Color.NONE
    } 
    static swap = function (color: string) {
        return (
            color === Color.WHITE ? Color.BLACK
            : color === Color.BLACK ? Color.WHITE
            : Color.NONE
        )
    }
    constructor () {}
}

export default Color
