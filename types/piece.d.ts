interface ChessPiece {
    key: string
    type: string
    color: string
    symbol: string
    unicode: string
    html: string

    /**
     * Get character symbol for this chess piece.
     * @returns piece text symbol
     */
    toString: () => string

    /**
     * Alias of toString() for logging.
     */
    inspect: () => string
}

export { ChessPiece }
