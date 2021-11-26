import Color from './color'
import { ChessPiece } from '../types/piece'

class Piece implements ChessPiece {
    // Static properties
    static readonly TYPE_NONE   = '.'
    static readonly TYPE_PAWN   = 'p'
    static readonly TYPE_KNIGHT = 'n'
    static readonly TYPE_BISHOP = 'b'
    static readonly TYPE_ROOK   = 'r'
    static readonly TYPE_QUEEN  = 'q'
    static readonly TYPE_KING   = 'k'
    // Piece objects
    static readonly WHITE_PAWN   = new Piece({ color: Color.WHITE, type: Piece.TYPE_PAWN,   unicode: '♙', html: '&#9812;' })
    static readonly WHITE_KNIGHT = new Piece({ color: Color.WHITE, type: Piece.TYPE_KNIGHT, unicode: '♘', html: '&#9816;' })
    static readonly WHITE_BISHOP = new Piece({ color: Color.WHITE, type: Piece.TYPE_BISHOP, unicode: '♗', html: '&#9815;' })
    static readonly WHITE_ROOK   = new Piece({ color: Color.WHITE, type: Piece.TYPE_ROOK,   unicode: '♖', html: '&#9814;' })
    static readonly WHITE_QUEEN  = new Piece({ color: Color.WHITE, type: Piece.TYPE_QUEEN,  unicode: '♕', html: '&#9813;' })
    static readonly WHITE_KING   = new Piece({ color: Color.WHITE, type: Piece.TYPE_KING,   unicode: '♔', html: '&#9812;' })
    static readonly BLACK_PAWN   = new Piece({ color: Color.BLACK, type: Piece.TYPE_PAWN,   unicode: '♟︎', html: '&#9823;' })
    static readonly BLACK_KNIGHT = new Piece({ color: Color.BLACK, type: Piece.TYPE_KNIGHT, unicode: '♞', html: '&#9822;' })
    static readonly BLACK_BISHOP = new Piece({ color: Color.BLACK, type: Piece.TYPE_BISHOP, unicode: '♝', html: '&#9821;' })
    static readonly BLACK_ROOK   = new Piece({ color: Color.BLACK, type: Piece.TYPE_ROOK,   unicode: '♜', html: '&#9820;' })
    static readonly BLACK_QUEEN  = new Piece({ color: Color.BLACK, type: Piece.TYPE_QUEEN,  unicode: '♛', html: '&#9819;' })
    static readonly BLACK_KING   = new Piece({ color: Color.BLACK, type: Piece.TYPE_KING,   unicode: '♚', html: '&#9818;' })
    static readonly NONE         = new Piece({ color: Color.NONE,  type: Piece.TYPE_NONE,   unicode: '',   html: ''        })
    // Map white pieces to lower case letters, black ones to upper case letters
    static readonly PIECES = {
        'P': Piece.WHITE_PAWN,
        'N': Piece.WHITE_KNIGHT,
        'B': Piece.WHITE_BISHOP,
        'R': Piece.WHITE_ROOK,
        'Q': Piece.WHITE_QUEEN,
        'K': Piece.WHITE_KING,
        'p': Piece.BLACK_PAWN,
        'n': Piece.BLACK_KNIGHT,
        'b': Piece.BLACK_BISHOP,
        'r': Piece.BLACK_ROOK,
        'q': Piece.BLACK_QUEEN,
        'k': Piece.BLACK_KING,
        '.': Piece.NONE
    }

    // There is an edge-case "promote to an enemy piece for a mate-in-1" puzzle from Sherlock Holmes Chess Mysteries book
    // which this setup does not allow to complete
    static readonly WHITE_PROMO_PIECES = [
        Piece.WHITE_QUEEN,
        Piece.WHITE_ROOK,
        Piece.WHITE_BISHOP,
        Piece.WHITE_KNIGHT,
    ]
    static readonly BLACK_PROMO_PIECES = [
        Piece.BLACK_QUEEN,
        Piece.BLACK_ROOK,
        Piece.BLACK_BISHOP,
        Piece.BLACK_KNIGHT,
    ]
    // Instance properties
    key: string
    type: string
    color: string
    symbol: string
    unicode: string
    html: string

    constructor (options: any) {
        this.type = options.type
        this.color = options.color
        this.symbol = this.color === Color.WHITE ? this.type.toUpperCase() : this.type
        this.key = this.type === Piece.TYPE_NONE ? '' :
                   (this.color === Color.WHITE ?  'w' : 'b') + this.type.toUpperCase()
        this.unicode = options.unicode
        this.html = options.html
        // Prevent changes to properties
        Object.freeze(this)
    }
    /**
     * Get character symbol for this chess piece.
     * @returns piece text symbol
     */
    toString () {
        return this.symbol
    }
    /**
     * Alias of toString() for logging.
     */
    inspect () {
        return this.toString()
    }
    /**
     * Get the chess piece for given symbol.
     * @param symbol piece symbol
     * @returns Piece
     */
    static forSymbol (symbol: string): Piece {
        return Piece.PIECES[symbol as keyof typeof Piece.PIECES]
    }
}

export default Piece
