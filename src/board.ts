import Annotation from './annotation'
import Color from './color'
import Fen from './fen'
import Flags from './flags'
import Game from './game'
import Log from './log'
import Move from './move'
import Turn from './turn'
import Options from './options'
import Piece from './piece'

import { ChessBoard } from '../types/board'
import { MethodOptions } from '../types/options'

class Board implements ChessBoard {
    // Instance properties
    id: number
    game: Game
    parentBoard: Board | null
    parentBranchTurnIndex: number | null
    turn: typeof Color.WHITE | typeof Color.BLACK
    enPassantSqr: number | null
    moveNum: number
    plyNum: number
    halfMoveCount: number
    castlingRights: { [color: string]: Flags }
    // King position can be null in analysis mode (before kings are set on the board)
    kingPos: { [color: string]: number | null }
    history: Turn[]
    selectedTurnIndex: number
    squares: Piece[]
    posCount: Map<string, number>
    continuation: boolean
    /** Cache possible moves, so it doesn't have to be calculated multiple times per turn */
    moveCache= {
        includeFen: false,
        includeSan: false,
        moves: [] as Move[]
    }

    constructor(game: Game) {
        this.id = game.boardVars.length
        this.game = game
        this.parentBoard = null
        this.parentBranchTurnIndex = null
        this.turn = Color.WHITE
        this.enPassantSqr = null
        this.moveNum = 1
        this.plyNum = 0
        this.halfMoveCount = 0 // For tracking 50/75 move rule
        // Create a 0x88 board presentation and populate it with NONE pieces
        this.squares = Array.apply(null, new Array(128)).map(() => (Piece.NONE))
        // Castling rights
        this.castlingRights = {
            [Color.WHITE]: new Flags([Flags.KSIDE_CASTLING, Flags.QSIDE_CASTLING]),
            [Color.BLACK]: new Flags([Flags.KSIDE_CASTLING, Flags.QSIDE_CASTLING])
        }
        // Position of king (as a 0x88 index)
        this.kingPos = {
            [Color.WHITE]: null,
            [Color.BLACK]: null
        }
        this.history = [] // Turn history
        this.selectedTurnIndex = -1 // -1 means no move is selected; selecting next move returns the first move
        this.posCount = new Map() // Used to track unique positions for three fold repetition rule
        this.continuation = false
        // Add this board to parent game's board variations
        game.boardVars.push(this)
    }
    /**
     * Make a copy of another Board
     * @param orig
     * @return copy
     */
    static copyFrom (orig: Board) {
        let newBoard = Object.create(Board.prototype)
        newBoard.id = orig.game.boardVars.length
        newBoard.game = orig.game
        newBoard.parentBoard = orig.parentBoard
        newBoard.parentBranchTurnIndex = orig.parentBranchTurnIndex
        newBoard.turn = orig.turn
        newBoard.enPassantSqr = orig.enPassantSqr
        newBoard.moveNum = orig.moveNum
        newBoard.plyNum = orig.plyNum
        newBoard.halfMoveCount = orig.halfMoveCount
        newBoard.squares = orig.squares.slice(0) // Can't copy mutable array directly
        newBoard.castlingRights = {
            [Color.WHITE]: orig.castlingRights[Color.WHITE].copy(),
            [Color.BLACK]: orig.castlingRights[Color.BLACK].copy()
        }
        newBoard.kingPos = {
            [Color.WHITE]: orig.kingPos[Color.WHITE],
            [Color.BLACK]: orig.kingPos[Color.BLACK]
        }
        newBoard.history = orig.history.slice(0)
        newBoard.selectedTurnIndex = orig.selectedTurnIndex
        newBoard.posCount = new Map(orig.posCount)
        newBoard.moveCache = {
            includeFen: orig.moveCache.includeFen,
            includeSan: orig.moveCache.includeSan,
            moves: orig.moveCache.moves.slice(0)
        }
        orig.game.boardVars.push(newBoard)
        return newBoard
    }
    /**
     * Create a new variation by branching a parent variation, returning it. The new variation
     * is automatically added to give game's list of board variations.
     * @param parent Board to base the new variations on
     * @param options MethodOptions.Board.createFromParent
     * @return new board variation
     */
    static createFromParent (parent: Board, options: any = {}) {
        options = Options.Board.createFromParent().assign(options) as MethodOptions.Board.createFromParent
        let newBoard = Board.copyFrom(parent)
        if (!options.continuation) {
            newBoard.undoMoves({ move: parent.selectedTurnIndex })
        }
        newBoard.parentBoard = parent
        newBoard.parentBranchTurnIndex = parent.selectedTurnIndex
        newBoard.continuation = options.continuation
        // Start with fresh history
        newBoard.selectedTurnIndex = -1
        newBoard.history = []
        newBoard.turnAnnotations = []
        return newBoard
    }
    /**
     * Create a new board state from FEN and return it
     * @param game game the new board belongs to
     * @param fen FEN string
     * @return new board
     */
    static createFromFen(game: Game, fen: string) {
        let newBoard = new Board(game)
        if (newBoard.loadFen(fen)) {
            return newBoard
        } else {
            return false
        }
    }
    /**
     * Load board state from given FEN, overwriting current state
     * @param fen FEN string
     * @return true on success, false on failure
     */
    loadFen (fen: string) {
        // Check that given FEN is valid
        const gameFen = new Fen(fen)
        let fenError = gameFen.validate()
        if (fenError.errorCode) {
            Log.error(`Cannot create variation from FEN: ${fenError.errorMessage} (${fen}).`)
            return false
        }
        const tokens = fen.split(/\s+/)
        const pos = tokens[0]
        let sqr = 0
        // Assing pieces
        for (let i = 0; i < pos.length; i++) {
            const sym = pos.charAt(i)
            if (sym === '/') {
                sqr += 8
            } else if ('0123456789'.indexOf(sym) !== -1) {
                sqr += parseInt(sym, 10)
            } else {
                this.put(Piece.forSymbol(sym), sqr)
                sqr++
            }
        }
        this.turn = tokens[1] as typeof Color.WHITE | typeof Color.BLACK
        this.castlingRights[Color.WHITE] = new Flags()
        this.castlingRights[Color.BLACK] = new Flags()
        // Check for remaining castling rights
        if (tokens[2].indexOf('K') > -1) {
            this.castlingRights[Color.WHITE].add(Flags.KSIDE_CASTLING)
        }
        if (tokens[2].indexOf('Q') > -1) {
            this.castlingRights[Color.WHITE].add(Flags.QSIDE_CASTLING)
        }
        if (tokens[2].indexOf('k') > -1) {
            this.castlingRights[Color.BLACK].add(Flags.KSIDE_CASTLING)
        }
        if (tokens[2].indexOf('q') > -1) {
            this.castlingRights[Color.BLACK].add(Flags.QSIDE_CASTLING)
        }
        this.enPassantSqr = (tokens[3] === '-') ? null
                            : Move.SQUARE_INDICES[tokens[3] as keyof typeof Move.SQUARE_INDICES]
        this.halfMoveCount = parseInt(tokens[4], 10)
        this.moveNum = parseInt(tokens[5], 10)
        this.plyNum = (this.moveNum - 1)*2 + (this.turn === Color.BLACK ? 1 : 0)
        this.posCount.set(this.toFen({ meta: false }), 1)
        return true
    }
    /**
     * Get the piece occupying the square
     * @param square 0x88 square index or square key (a1, a1,... h7, h8)
     * @return piece at square
     */
    pieceAt (square: number | string): Piece {
        // Seperate check for algebraic and 0x88 index lookups
        // It feels kind of silly to look up pieces by 0x88, as they are stored in this object anyway,
        // but at least this method contains an error check
        if (typeof square === 'number') {
            if (!(square in Move.SQUARE_NAMES)) {
                Log.error(`Cannot return piece at ${square}: Value is not a valid 0x88 board square.`)
                return Piece.NONE
            }
            return this.squares[square]
        } else {
            if (!(square in Move.SQUARE_INDICES)) {
                Log.error(`Cannot return piece at ${square}: Value is not a valid algebraic representation of a square.`)
                return Piece.NONE
            }
            return this.squares[Move.SQUARE_INDICES[square as keyof typeof Move.SQUARE_INDICES]]
        }
    }
    /**
     * Put a piece on the given square
     * @param piece
     * @param square 0x88 square index
     */
    put (piece: Piece, square: number) {
        // Check that piece and square are valid
        if (!(piece.symbol in Piece.PIECES) || !(square in Move.SQUARE_NAMES)) {
            Log.error(`Cannot put piece to requested square: One of the values is invalid (${piece}, ${square}).`)
            return false
        }
        // Each player may have only one king on the board
        if (piece.type === Piece.TYPE_KING && this.kingPos[piece.color] !== null) {
            Log.error("Cannot have more than one king per side.")
            return false
        }
        // Check if there is a piece already in the square and return it
        const prevPiece = this.pieceAt(square)
        // Place the piece and save possible king position
        this.squares[square] = piece
        if (piece.type === Piece.TYPE_KING) {
            this.kingPos[piece.color] = square
        }
        return prevPiece
    }
    /**
     * Remove the piece occupying given square; returns removed piece
     * @param square 0x88 square index
     * @return removed piece, false on error
     */
    remove (square: number) {
        // Check that square is valid
        if (!Move.isValidIndex(square)) {
            Log.error(`Cannot remove piece from ${square}: Value is not a valid square index.`)
            return false
        }
        const piece = this.pieceAt(square)
        if (piece === Piece.NONE) {
            Log.info(`Could not remove piece from ${Move.SQUARE_NAMES[square as keyof typeof Move.SQUARE_NAMES]}: The square was already vacant.`)
        } else if (piece.type === Piece.TYPE_KING) {
            this.kingPos[piece.color] = null
        }
        // Assign empty square
        this.squares[square] = Piece.NONE
        return piece
    }
    /**
     * Return a list of captured pieces for given color
     * @param color Color.WHITE or Color.BLACK
     */
    getCapturedPieces (color: string) {
        let pieceList = []
        for (let i=0; i<this.history.length; i++) {
            if (this.history[i].move.capturedPiece?.type !== Piece.TYPE_NONE && this.history[i].move.capturedPiece?.color === color) {
                pieceList.push(this.history[i].move.capturedPiece?.type)
            }
        }
        // Custom sorting of captured pieces, in the order Queen > Rook > Bishop > Knight > Pawn
        pieceList.sort(function(a, b) {
            if (a === b) {
                return 0
            } else if (a === Piece.TYPE_QUEEN) {
                return -1
            } else if (a === Piece.TYPE_ROOK && b !== Piece.TYPE_QUEEN) {
                return -1
            } else if (a === Piece.TYPE_BISHOP && b !== Piece.TYPE_QUEEN && b !== Piece.TYPE_ROOK) {
                return -1
            } else if (a === Piece.TYPE_KNIGHT && b === Piece.TYPE_PAWN) {
                return -1
            } else {
                return 1
            }
        })
        return pieceList
    }
    /**
     * Get file index of a 0x88 position index
     * @param p position index
     * @return 0-7
     */
    static file (p: number) {
        return p & 15
    }
    /***
     * Get rank index of a 0x88 position index
     * @param p position index
     * @return 0-7
     */
    static rank (p: number) {
        return p >> 4
    }
    /**
     * Get algebraic representation of a 0x88 position index
     * @param p position index
     */
    static toAlgebraic (p: number) {
        if (!Move.isValidIndex(p)) {
            return null
        }
        return Move.SQUARE_NAMES[p as keyof typeof Move.SQUARE_NAMES]
    }
    /**
     * Get a FEN string representing current board state
     * @param options MethodOptions.Board.toFen
     */
    toFen (opts: MethodOptions.Board.toFen = {}) {
        const options = Options.Board.toFen().assign(opts) as MethodOptions.Board.toFen
        let empty = 0
        let fen = ""
        // Loop through all the squares
        for (let i=Move.SQUARE_INDICES.a8; i<=Move.SQUARE_INDICES.h1; i++) {
            if (this.squares[i] === Piece.NONE) {
                empty++
            } else {
                if (empty) {
                    // Add empty square count to FEN
                    fen += empty
                    empty = 0
                }
                fen += this.squares[i]
            }
            if ((i + 1) & 0x88) {
                // New rank
                if (empty) {
                    fen += empty
                }
                // Print slash if this is not the last rank
                if (i !== Move.SQUARE_INDICES.h1) {
                    fen += "/"
                }
                empty = 0
                i += 8
            }
        }
        // Return board position if metainfo is not requested
        if (!options.meta) {
            return fen
        } else {
            fen += " " + this.turn
        }
        // Check castling rights
        let cr = ""
        if (this.castlingRights[Color.WHITE].contains(Flags.KSIDE_CASTLING)) cr += 'K'
        if (this.castlingRights[Color.WHITE].contains(Flags.QSIDE_CASTLING)) cr += 'Q'
        if (this.castlingRights[Color.BLACK].contains(Flags.KSIDE_CASTLING)) cr += 'k'
        if (this.castlingRights[Color.BLACK].contains(Flags.QSIDE_CASTLING)) cr += 'q'
        // Add castling flags or - if no castling rights remain
        fen += " " + (cr ? cr : "-")
        // Add enpassant square or - if none exist
        fen += " " + (this.enPassantSqr !== null ? Board.toAlgebraic(this.enPassantSqr) : "-")
        // Add half move and move counters
        fen += " " + this.halfMoveCount + " " + this.moveNum
        return fen
    }

    /*
    =========================
    MOVE METHODS
    =========================
    */

    /**
     * Get a simple list of possible moves in current board state
     * @param opts { notation, onlyDestinations, includeFen, onlyForSquare, filter }
     */
    getMoves (opts: MethodOptions.Board.getMoves = {}) {
        let moveDataType: { move: string, fen: string, algebraic: string, san: string, uci: string }
        let finalMovesType: { blocked: typeof moveDataType[], illegal: typeof moveDataType[], legal: typeof moveDataType[] }
        const options = Options.Board.getMoves().assign(opts) as MethodOptions.Board.getMoves
        let moves = this.generateMoves({
            includeSan: options.notation === 'all' || options.notation === 'san',
            includeFen: options.includeFen,
            onlyLegal: options.filter === 'legal'
        })
        let finalMoves = { blocked: [], illegal: [], legal: [] } as typeof finalMovesType
        for (const move of moves) {
            const moveData = {} as typeof moveDataType
            //Skip moves that are not requested
            if ((options.filter === 'legal' && !move.legal)
                || (options.filter === 'illegal' && (move.legal)) // Blocked moves are also illegal
                || (options.filter === 'blocked' && (move.legal || !move.flags?.contains(Flags.MOVE_BLOCKED)))
                || (options.onlyForSquare !== null && (move.algebraic?.substring(0,2) !== options.onlyForSquare))
            ) {
                return
            }
            // Populate notation fields
            if (options.onlyDestinations) {
                // Destinations are always the same
                if (options.includeFen) {
                    moveData.move = move.algebraic?.substring(3,5) || ''
                    moveData.fen = move.fen || ''
                } else {
                    moveData.algebraic = move.algebraic?.substring(3,5) || ''
                }
            } else {
                if (options.notation == 'all') {
                    moveData.algebraic = move.algebraic || ''
                    moveData.san = move.san || ''
                    moveData.uci = move.algebraic?.substring(0,2) || '' + move.algebraic?.substring(3) || ''
                    if (options.includeFen) {
                        moveData.fen = move.fen || ''
                    }
                } else if (options.notation === 'algebraic') {
                    if (options.includeFen) {
                        moveData.move = move.algebraic || ''
                        moveData.fen = move.fen || ''
                    } else {
                        moveData.algebraic = move.algebraic || ''
                    }
                } else if (options.notation === 'san') {
                    if (options.includeFen) {
                        moveData.move = move.san || ''
                        moveData.fen = move.fen || ''
                    } else {
                        moveData.san = move.san || ''
                    }
                } else if (options.notation === 'uci') {
                    if (options.includeFen) {
                        moveData.move = move.algebraic?.substring(0,2) || '' + move.algebraic?.substring(3) || ''
                        moveData.fen = move.fen || ''
                    } else {
                        moveData.uci = move.algebraic?.substring(0,2) || '' + move.algebraic?.substring(3) || ''
                    }
                }
            }
            // Sort by type
            if (move.legal) {
                finalMoves.legal.push(moveData)
            } else if (move.flags?.contains(Flags.MOVE_BLOCKED)) {
                finalMoves.blocked.push(moveData)
            } else {
                finalMoves.illegal.push(moveData)
            }
        }
        return finalMoves
    }
    /**
     * Generate a list of possible moves in current board position
     * @param options { onlyForSquare, includeSan, includeFen, onlyLegal }
     */
    generateMoves (opts: MethodOptions.Board.generateMoves = {}) {
        const options = Options.Board.generateMoves().assign(opts) as MethodOptions.Board.generateMoves
        // Check if there are already moves cached for this turn
        // If SAN or FEN is requested and not included in cached moves, we have to calculate them
        /*console.log('moves',
            this.moveCache.length,
            !options.includeSan || this.moveCache[0]?.san !== undefined,
            !options.includeFen || this.moveCache[0]?.fen !== undefined
        )*/
        if (this.moveCache.moves.length
            && (!options.includeSan || this.moveCache.includeSan)
            && (!options.includeFen || this.moveCache.includeFen)
        )  {
            if (!options.onlyLegal) {
                return this.moveCache.moves
            }
            // Else we'll check for valid moves
            let legalMoves = []
            for (let i=0; i<this.moveCache.moves.length; i++) {
                if (this.moveCache.moves[i].legal)
                    legalMoves.push(this.moveCache.moves[i])
            }
            return legalMoves
        }
        // Declare variables also used in helper function
        const newMoves: Move[] = []
        const active = this.turn
        const passive = (this.turn === Color.WHITE ? Color.BLACK : Color.WHITE)
        // Helper method to add new moves to the list
        const addMove = (orig: number, dest: number, board: Board, flags: number[] = []) => {
            // Get the captured piece, with a special rule for en passant (on rank lower for white, one rank higher for black)
            // Checking board.squares[] looks a bit dull, but considering how many this these methods are called
            // there could be a considerable performance penalty in using board.pieceAt() with its error checking
            const captPiece = (flags.indexOf(Flags.EN_PASSANT) !== -1 ? board.squares[dest + (passive === Color.BLACK? 16 : -16)] : board.squares[dest])
            const moveOpts = {
                orig: orig,
                dest: dest,
                movedPiece: board.squares[orig],
                capturedPiece: captPiece,
                promotionPiece: undefined as Piece | undefined,
                flags: flags
            } as MethodOptions.MoveOptions
            let newMove: Move
            // Check if a pawn has reached then last rank for promotion
            if (board.squares[orig].type === Piece.TYPE_PAWN
                && (Board.rank(dest) === 0 || Board.rank(dest) === 7))
            {
                const promoPieces = (board.turn === Color.WHITE ? Piece.WHITE_PROMO_PIECES : Piece.BLACK_PROMO_PIECES)
                // Each possible promotion is its own move
                promoPieces.forEach((promoPiece) => {
                    moveOpts.promotionPiece = promoPiece
                    newMove = new Move(moveOpts)
                    if (newMove.error === undefined) {
                        newMoves.push(newMove)
                    } else {
                        Log.error(newMove.error)
                    }
                })
            } else {
                newMove = new Move(moveOpts)
                if (newMove.error === undefined) {
                    newMoves.push(newMove)
                } else {
                    Log.error(newMove.error)
                }
            }
        }
        // Index of the pawn rank
        const secondRank = {
            [Color.WHITE]: 6,
            [Color.BLACK]: 1
        }
        // Squares in the 0x88 board order
        let firstSqr = Move.SQUARE_INDICES.a8
        let lastSqr = Move.SQUARE_INDICES.h1
        if (typeof options.onlyForSquare === 'string') {
            // Set first and last squares to the requested square
            if (options.onlyForSquare in Move.SQUARE_INDICES) {
                firstSqr = lastSqr = Move.SQUARE_INDICES[options.onlyForSquare as keyof typeof Move.SQUARE_INDICES]
            } else {
                return [] // Invalid request
            }
        }
        // Loop through all squares. TODO: Potential for performance improvement?
        for (let i=firstSqr; i<=lastSqr; i++) {
            // Check that we're still on actual board squares
            // Bitwise checking for this is, at least in theory, considerably faster than say just checking each
            // square for Piece.NONE (which occupies out-of-board squares in the array)
            // https://www.chessprogramming.org/0x88
            if (i & 0x88) {
                // Skip to next rank
                i += 7
                continue
            }
            const piece = this.squares[i]
            // Don't calculate moves for empty squares or opponent pieces
            if (piece === Piece.NONE || piece.color !== active) {
                continue
            }
            let sqr
            // Pawn moves
            if (piece.type === Piece.TYPE_PAWN) {
                // Single square advancement moves
                sqr = i + Move.PAWN_OFFSETS[active as keyof typeof Move.PAWN_OFFSETS][0]
                if (this.squares[sqr] === Piece.NONE) {
                    addMove(i, sqr, this, [Flags.NORMAL])
                    // If the first square was vacant, check for double advancement
                    sqr = i + Move.PAWN_OFFSETS[active as keyof typeof Move.PAWN_OFFSETS][1]
                    // The move must originate from the pawn rank and destination square must be vacant
                    if (secondRank[active as keyof typeof secondRank] === Board.rank(i)) {
                        if (this.squares[sqr] === Piece.NONE) {
                            addMove(i, sqr, this, [Flags.DOUBLE_ADV])
                        } else {
                            addMove(i, sqr, this, [Flags.MOVE_BLOCKED])
                        }
                    }
                } else {
                    // Add moves as blocked
                    addMove(i, sqr, this, [Flags.MOVE_BLOCKED])
                    if (secondRank[active as keyof typeof secondRank] === Board.rank(i)) {
                        addMove(i, i + Move.PAWN_OFFSETS[active as keyof typeof Move.PAWN_OFFSETS][1], this, [Flags.MOVE_BLOCKED])
                    }
                }
                // Capture moves
                for (let j=2; j<4; j++) {
                    sqr = i + Move.PAWN_OFFSETS[active as keyof typeof Move.PAWN_OFFSETS][j]
                    if (sqr & 0x88) { // Dont' check out of board squares
                        continue
                    } else if (this.squares[sqr] !== Piece.NONE && this.squares[sqr].color === passive) {
                        addMove(i, sqr, this, [Flags.CAPTURE])
                    } else if (sqr === this.enPassantSqr) { // En passant capture
                        addMove(i, sqr, this, [Flags.EN_PASSANT])
                    }
                }
            } else {
                // Non-pawn pieces
                for (let j=0; j<Move.PIECE_OFFSETS[piece.type as keyof typeof Move.PIECE_OFFSETS].length; j++) {
                    const offset = Move.PIECE_OFFSETS[piece.type as keyof typeof Move.PIECE_OFFSETS][j]
                    sqr = i + offset
                    let dirBlocked = false
                    while (!(sqr & 0x88)) {
                        // Check for squares on the "physical" board
                        if (dirBlocked) {
                            // Add rest of the blocked moves
                            addMove(i, sqr, this, [Flags.MOVE_BLOCKED])
                            sqr += offset
                            continue
                        }
                        if (this.squares[sqr] === Piece.NONE) {
                            addMove(i, sqr, this, [Flags.NORMAL])
                        } else {
                            if (this.squares[sqr].color !== active) {
                                addMove(i, sqr, this, [Flags.CAPTURE])
                            } else {
                                addMove(i, sqr, this, [Flags.MOVE_BLOCKED])
                            }
                            dirBlocked = true
                        }
                        // Knight and king can only make one move in each direction
                        if (piece.type === Piece.TYPE_KING || piece.type === Piece.TYPE_KNIGHT) {
                            break
                        }
                        // Next square in the direction of movement
                        sqr += offset
                    }
                }
            }
            // Castling moves are only checked if the piece is a king or we are calculating all moves
            // Calling indexOf() is slower than doing bit-wise checking, but we don't have to iterate this too many times
            // Possibly could move to bit-wise checking in the future, as was in aaronfi's original version
            if (i === this.kingPos[active]) {
                // Check that castling is still possible
                const orig = this.kingPos[active] as number
                if (this.castlingRights[active].contains(Flags.KSIDE_CASTLING)) {
                    const dest = orig + 2
                    if (this.squares[orig + 1] === Piece.NONE
                        && this.squares[dest] === Piece.NONE // Squares must be vacant
                        && !this.isAttacked(passive, this.kingPos[active]) // Cannot castle a king in check
                        && !this.isAttacked(passive, orig + 1) // Can't castle a king across an attacked square
                        && !this.isAttacked(passive, dest)) // Can't move king into an attacked square
                    {
                        addMove(orig, dest, this, [Flags.KSIDE_CASTLING])
                    } else {
                        addMove(orig, dest, this, [Flags.KSIDE_CASTLING, Flags.MOVE_BLOCKED])
                    }
                }
                if (this.castlingRights[active].contains(Flags.QSIDE_CASTLING)) {
                    const dest = orig - 2
                    if (this.squares[orig - 1] === Piece.NONE
                        && this.squares[orig - 2] === Piece.NONE
                        && this.squares[orig - 3] === Piece.NONE
                        && !this.isAttacked(passive, orig)
                        && !this.isAttacked(passive, orig - 1)
                        && !this.isAttacked(passive, dest))
                    {
                        addMove(orig, dest, this, [Flags.QSIDE_CASTLING])
                    } else {
                        addMove(orig, dest, this, [Flags.QSIDE_CASTLING, Flags.MOVE_BLOCKED])
                    }
                }
            }
        }
        // Make another array for only legal moves
        let legalMoves = []
        // No point in checking if no moves are possible
        if (newMoves.length) {
            // aaronfi's original method is commented out
            // const futureMoves = this.history.slice(this.selectedTurnIndex + 1)
            for (let i=0; i<newMoves.length; i++) {
                //this.makeMove(newMove, null, Options.Board.DEFAULTS.moveMeta, options = { updatePosCount: false, isPlayerMove: false })
                const tmpBoard = this.makeMockMove(newMoves[i]) as Board
                if (options.includeFen) {
                    // Calculating FEN takes time, so only do it if requested
                    newMoves[i].fen = tmpBoard.toFen()
                }
                // Check for appropriate flags
                if (tmpBoard.isInCheck(active)) {
                    // Move would lead the active player in check
                    if (this.isInCheck(active)) {
                        newMoves[i].flags?.add(Flags.IN_CHECK)
                    } else {
                        newMoves[i].flags?.add(Flags.PINNED)
                    }
                    // Not breaking here will result in an infine call stack error
                    // So calculate SAN and move on to the next item
                    if (options.includeSan && !options.onlyLegal) {
                        newMoves[i].san = Move.toSan(newMoves[i], this)
                    }
                    newMoves[i].legal = false
                    continue
                } else if (tmpBoard.isInCheck(passive)) {
                    newMoves[i].flags?.add(Flags.CHECK)
                    if (tmpBoard.isInCheckmate()) {
                        newMoves[i].flags?.add(Flags.CHECKMATE)
                    }
                }
                // Now that we have checked for the last flags that affect SAN, we can calculate them
                if (options.includeSan && !options.onlyLegal) {
                    newMoves[i].san = Move.toSan(newMoves[i], this)
                }
                // Mark blocked moves as illegal and move to the next
                if (newMoves[i].flags?.contains(Flags.MOVE_BLOCKED)) {
                    newMoves[i].legal = false
                    continue
                }
                // SAN only for legal moves
                if (options.includeSan && options.onlyLegal) {
                    newMoves[i].san = Move.toSan(newMoves[i], this)
                }
                //this.undoMoves({ updatePosCount: false })
                newMoves[i].legal = true
                legalMoves.push(newMoves[i])
            }
            // Restore the saved history
            // this.history = this.history.concat(futureMoves)
        }
        // Cache moves for this turn
        if (
            // Technically I shouldn't have to check this, but in case I make some changes to the upstream code later
            !this.moveCache.moves.length ||
            // Test if new moves include more information than currently cached ones
            (
                ((this.moveCache.includeFen !== options.includeFen) || (this.moveCache.includeSan !== options.includeSan))
                && (!this.moveCache.includeSan || options.includeSan)
                && (!this.moveCache.includeFen || options.includeFen)
            )
        ) {
            // The `|| false` is just to satisfy Typescript linter
            this.moveCache.includeFen = options.includeFen || false
            this.moveCache.includeSan = options.includeSan || false
            this.moveCache.moves = newMoves
        }
        if (options.onlyLegal) {
            return legalMoves
        } else {
            return newMoves
        }
    }
    /**
     * Check if the proposed move is a new move or already the next move in history (that is, either
     * the next move itself, a continuation of current move, or a variation of the next move).
     * @param move
     * @return { isNew (boolean), contIdx (number, -1 if not a continuation), varIdx (number, -1 if not a variation) }
     */
    isNewMove (move: Move) {
        // This method really exists just so I could call this check directly from Game
        if (this.selectedTurnIndex + 1 === this.history.length) {
            // Must be new if we're at the end of history
            return { isNew: true, contIdx: -1, varIdx: -1 }
        }
        // Is this move equal to the next move in history
        if (this.history[this.selectedTurnIndex + 1].move.san === move.san || move.wildcard) {
            return { isNew: false, contIdx: -1, varIdx: -1 }
        }
        // Does any continuation of the current move match the attempted move
        const curVars = this.history[this.selectedTurnIndex].variations
        for (let i=0; i<curVars.length; i++) {
            if (curVars[i].continuation && curVars[i].history[0].move.algebraic === move.algebraic) {
                return { isNew: false, contIdx: i, varIdx: -1 }
            }
        }
        // Does any variation of the next move in history match the attempted move
        const nextVars = this.history[this.selectedTurnIndex + 1].variations
        for (let i=0; i<nextVars.length; i++) {
            if (!nextVars[i].continuation // Skip continuations
                && (nextVars[i].history[0].move.algebraic === move.algebraic
                || nextVars[i].history[0].move.wildcard))
            {
                return { isNew: false, contIdx: -1, varIdx: i }
            }
        }
        // No matching moves in history
        return { isNew: true, contIdx: -1, varIdx: -1 }
    }
    /**
     * Make a new move on the board
     * @param move
     * @param options Options.Board.makeMove
     */
    makeMove (move: Move, opts: MethodOptions.Board.makeMove = {}) {
        const options = Options.Board.makeMove().assign(opts) as MethodOptions.Board.makeMove
        // Handle user moves
        if (options.isPlayerMove) {
            // Check if there is a next move in history and if it is equal to this move (only happens with take-backs)
            if (this.selectedTurnIndex + 1 < this.history.length) {
                // If this move is equal to the next move in history, simply go to that move
                const { isNew, contIdx, varIdx } = this.isNewMove(move)
                if (!isNew) {
                    // Move already exists
                    if (contIdx !== -1) {
                        // Enter the continuation
                        Log.debug("Attempted move was already a continuation of the current move.")
                        if (this.game.enterContinuation(contIdx)) {
                            return this.game.currentBoard.history[0]
                        } else {
                            return false
                        }
                    } else {
                        // The move is either the next move in history or one of its variations
                        let logLvl = Log.getLevel()
                        Log.setLevel(Log.LEVELS.DISABLE) // Do not log next move
                        this.next()
                        Log.setLevel(logLvl)
                        if (varIdx !== -1) {
                            // Enter the correct variation
                            Log.debug("Attempted move was already a variation of the next move in history.")
                            if (this.game.enterVariation(varIdx)) {
                                return this.game.currentBoard.history[0]
                            } else {
                                return false
                            }
                        } else {
                            Log.debug("Attempted move was equal to already existing next move in history.")
                            return this.history[this.selectedTurnIndex]
                        }
                    }
                } else {
                    Log.debug("Branching new variation")
                    // New move; branch a new variation
                    // We have to make the next move so that we can take it back when parsing the variation
                    // (kinda stupid, I know, but that's how a variation is defined)
                    this.next()
                    const turn = this.getSelectedTurn()
                    const newBoard = Board.createFromParent(this, { continuation: false })
                    turn.variations.push(newBoard)
                    newBoard.makeMove(move, options)
                    this.game.currentBoard = newBoard
                    return turn
                }
            }
            // Check if any continuation of the current move matches attempted move
            if (this.history[this.selectedTurnIndex] && this.history[this.selectedTurnIndex].variations.length) {
                const childVars = this.history[this.selectedTurnIndex].variations
                for (let i=0; i < childVars.length; i++) {
                    if (childVars[i].continuation // Only continuations
                        && (childVars[i].history[0].move.san === move.san
                        || childVars[i].history[0].move.wildcard))
                    {
                        if (this.game.enterContinuation(i)) {
                            return this.game.currentBoard.history[0]
                        } else {
                            return false
                        }
                    }
                }
            }
        }
        // We're at the end of turn history or this is not a user move
        // Record move time and delta from last move
        let meta = {} as { moveTime: number, moveTimeDelta: number, comments: string, puzzleSolution: boolean }
        if (this.history.length) {
            if (!options.moveTime) {
                meta.moveTime = Date.now()
            }
            if (!options.moveTimeDelta) {
                meta.moveTimeDelta = meta.moveTime - (this.history[this.selectedTurnIndex - 1]?.meta?.moveTime || 0)
            }
        }
        // Store a unique identifier for this move
        const lastMove = this.history[this.history.length - 1]
        const moveId = this.plyNum.toString()
                       + (lastMove?.move?.uci || '')
                       + (move.wildcard ? Move.WILDCARD_MOVES[0] : move.uci)
        const newMove = new Turn({
            fen: this.toFen(),
            move: move,
            id: moveId,
            castlingRights : {
                [Color.WHITE]: this.castlingRights[Color.WHITE].copy(),
                [Color.BLACK]: this.castlingRights[Color.BLACK].copy()
            },
            kingPos: this.kingPos,
            turn: this.turn,
            enPassantSqr: this.enPassantSqr,
            moveNum: this.moveNum,
            halfMoveCount: this.halfMoveCount,
            plyNum: this.plyNum,
            variations: [],
            turnAnnotations: [],
            meta: meta,
        })
        // TODO: Handle removed pawn when promoting
        const removedPiece = this.commitMove(move, options.updatePosCount)
        this.selectedTurnIndex++
        if (options.comment) {
            this.getSelectedTurn().turnAnnotations.push(options.comment)
        }
        this.history.splice(this.selectedTurnIndex, 0, newMove)
        // TODO: Check if the main variation (and thus the game) has finished
        if (options.isPlayerMove && !this.id && this.isFinished()) {
            console.log('main variation finished')
        }
        return newMove
    }
    /**
     * Commit a move, handling captures, promotions and other special cases, essentially updating the
     * board state to match the move. This method can also be called to "remake" a move from the history.
     * @param move
     * @param updatePosCount count the following position towards position repetitions
     *                                 in threefold and fivefold peretition rules (default true)
     */
    commitMove (move: Move, updatePosCount = true) {
        // Determine active and passive player
        const active = this.turn
        const passive = (active === Color.WHITE ? Color.BLACK : Color.WHITE)
        let removedPiece = Piece.NONE
        // Move the piece to destination square and clear origin square
        this.squares[move.dest as number] = this.squares[move.orig as number]
        this.squares[move.orig as number] = Piece.NONE
        // Remove a pawn captured en passant
        if (move.flags?.contains(Flags.EN_PASSANT)) {
            if (active === Color.WHITE) {
                // The captured pawn is one rank below destination square
                removedPiece = this.remove(move.dest as number + 16) as Piece
            } else {
                // The captured pawn is one rank above destination square
                removedPiece = this.remove(move.dest as number - 16) as Piece
            }
        } else if (move.flags?.contains(Flags.PROMOTION)) {
            // Replace pawn with promotion piece
            removedPiece = this.put(move.promotionPiece as Piece, move.dest as number) as Piece
        }
        // Handle special king moves
        if (move.movedPiece?.type === Piece.TYPE_KING) {
            this.kingPos[active] = move.dest
            // Handle rook moves when castling
            if (move.flags?.contains(Flags.KSIDE_CASTLING)) {
                this.squares[move.dest as number - 1] = this.squares[move.dest as number + 1]
                this.squares[move.dest as number + 1] = Piece.NONE
            } else if (move.flags?.contains(Flags.QSIDE_CASTLING)) {
                this.squares[move.dest as number + 1] = this.squares[move.dest as number - 2]
                this.squares[move.dest as number - 2] = Piece.NONE
            }
            // This player can no longer castle
            this.castlingRights[active].clear()
        }
        // Remove castling rights if rook is moved
        if (this.castlingRights[active].length) {
            if (active === Color.WHITE) {
                if (move.orig === Move.SQUARE_INDICES.a1) {
                    this.castlingRights[active].remove(Flags.QSIDE_CASTLING, true) // Do a silent remove
                } else if (move.orig === Move.SQUARE_INDICES.h1) {
                    this.castlingRights[active].remove(Flags.KSIDE_CASTLING, true)
                }
            } else {
                if (move.orig === Move.SQUARE_INDICES.a8) {
                    this.castlingRights[active].remove(Flags.QSIDE_CASTLING, true)
                } else if (move.orig === Move.SQUARE_INDICES.h8) {
                    this.castlingRights[active].remove(Flags.KSIDE_CASTLING, true)
                }
            }
        }
        // Remove castling rights if rook is captured
        if (this.castlingRights[passive].length) {
            if (passive === Color.WHITE) {
                if (move.dest === Move.SQUARE_INDICES.a1) {
                    this.castlingRights[active].remove(Flags.QSIDE_CASTLING, true)
                } else if (move.dest === Move.SQUARE_INDICES.h1) {
                    this.castlingRights[active].remove(Flags.KSIDE_CASTLING, true)
                }
            } else {
                if (move.dest === Move.SQUARE_INDICES.a8) {
                    this.castlingRights[active].remove(Flags.QSIDE_CASTLING, true)
                } else if (move.dest === Move.SQUARE_INDICES.h8) {
                    this.castlingRights[active].remove(Flags.KSIDE_CASTLING, true)
                }
            }
        }
        // Record en passant if pawn makes double advance
        if (move.flags?.contains(Flags.DOUBLE_ADV)) {
            if (active === Color.WHITE) {
                this.enPassantSqr = move.dest as number + 16 // En passant square is one rank below the pawn
            } else {
                this.enPassantSqr = move.dest as number - 16 // En passant square is one rank above the pawn
            }
        } else {
            this.enPassantSqr = null
        }
        // Reset half move counter and three fold repetition counter if a pawn moves or capture takes place
        if (move.movedPiece?.type === Piece.TYPE_PAWN
            || move.flags?.contains(Flags.CAPTURE)
            || move.flags?.contains(Flags.EN_PASSANT)
        ) {
            this.halfMoveCount = 0
            if (updatePosCount) {
                this.posCount = new Map()
            }
        } else {
            this.halfMoveCount++
            if (updatePosCount) {
                const fen  = this.toFen({ meta: false })
                if (this.posCount.has(fen)) {
                    this.posCount.set(fen, this.posCount.get(fen) || 0 + 1)
                } else {
                    this.posCount.set(fen, 1)
                }
            }
        }
        // Prepare the state for next move
        this.plyNum++
        this.moveNum = Math.floor(this.plyNum/2) + 1
        this.turn = (this.turn === Color.WHITE ? Color.BLACK : Color.WHITE)
        this.resetMoveCache()
        return removedPiece
    }
    /**
     * Undo a move or all moves until the given move index, permanently removing them from the turn history
     * @param options { move, updatePosCount }
     */
    undoMoves (options: MethodOptions.Board.undoMoves = { updatePosCount: true }) {
        if (options.move !== undefined && (options.move < 0 || options.move >= this.history.length)) {
            // Move index is out of bounds
            Log.error(`Could not undo move: Move index is out of bounds (${options.move}).`)
            return false
        }
        if (!this.plyNum) {
            // There is no move to undo
            Log.debug("Cound not undo move: There are no moves made yet.")
            return false
        }
        let moveIndex = this.history.length - 1 // Remove last move by default
        if (options.move !== undefined) {
            moveIndex = options.move
        }
        // If we undo a move in the middle of history, all following moves are removed
        // TODO: Inform user about removal of all following moves
        const removedMoves = this.history.splice(moveIndex)
        this.commitUndoMoves(removedMoves)
        // Correct selected move index if the selected move was undone
        if (this.selectedTurnIndex >= this.history.length) {
            this.selectedTurnIndex = this.history.length - 1
        }
        return removedMoves
    }
    /**
     * Commit undoing moves, handling captures, promotions and other special cases, updating the
     * board state to reflect these changes. This method can be called to traverse back in turn
     * history without actually altering it.
     * @param moves
     */
    commitUndoMoves (moves: Turn[]) {
        // Revert board state to match the first move on the list
        this.castlingRights = {
            [Color.WHITE]: moves[0].castlingRights[Color.WHITE].copy(),
            [Color.BLACK]: moves[0].castlingRights[Color.BLACK].copy()
        }
        this.kingPos = {
            [Color.WHITE]: moves[0].kingPos[Color.WHITE],
            [Color.BLACK]: moves[0].kingPos[Color.BLACK]
        }
        this.turn = moves[0].turn
        this.enPassantSqr = moves[0].enPassantSqr
        this.moveNum = moves[0].moveNum
        this.plyNum = moves[0].plyNum
        this.halfMoveCount = moves[0].halfMoveCount
        // Reverse the moves to start from the last
        moves.reverse()
        // Undo the moves in turn history
        for (let i=0; i<moves.length; i++) {
            const active = this.turn
            const move = moves[i].move
            // Undo capture and en passant
            if (move.flags?.contains(Flags.CAPTURE)) {
                this.squares[move.dest as number] = move.capturedPiece as Piece
            }
            else if (move.flags?.contains(Flags.EN_PASSANT)) {
                if (active === Color.WHITE) {
                    this.squares[move.dest as number + 16] = move.capturedPiece as Piece // Must be pawn
                } else {
                    this.squares[move.dest as number - 16] = move.capturedPiece as Piece
                }
            } else {
                this.squares[move.dest as number] = Piece.NONE
            }
            // Undo castling
            if (move.flags?.contains(Flags.KSIDE_CASTLING)) {
                this.squares[move.dest as number + 1] = this.squares[move.dest as number - 1]
                this.squares[move.dest as number - 1] = Piece.NONE
            } else if (move.flags?.contains(Flags.QSIDE_CASTLING)) {
                this.squares[move.dest as number - 2] = this.squares[move.dest as number + 1]
                this.squares[move.dest as number + 1] = Piece.NONE
            }
            this.squares[move.orig as number] = move.movedPiece as Piece
            this.resetMoveCache()
        }
    }
    resetMoveCache () {
        this.moveCache = {
            includeFen: false,
            includeSan: false,
            moves: [],
        }
    }
    /**
     * Make a move from a SAN string
     * @param san a DISAMBIGUOUS SAN string
     * @param game
     * @param options Options.Board.makeMove
     * @return Move on success, { error } on failure
     */
    makeMoveFromSAN (san: string, options: MethodOptions.Board.makeMove = {}) {
        let move = Move.generateFromSan(san, this)
        if (move.error === undefined) {
            Log.debug(`Making a move from SAN: ${san}.`)
            return this.makeMove(move as Move, options)
        } else {
            return move
        }
    }
    /**
     * Make a move from algebraic square names
     * @param orig a1...h8
     * @param dest a1...h8
     * @param game
     * @param options Options.Board.makeMove
     * @return Move on success, { error } on failure
     */
    makeMoveFromAlgebraic (orig: string, dest: string, options: MethodOptions.Board.makeMove = {}) {
        let move = Move.generateFromAlgebraic(orig, dest, this)
        if (move.error === undefined) {
            Log.debug(`Making a move from algebraic: ${orig}-${dest}.`)
            return this.makeMove(move as Move, options)
        } else {
            Log.error(`Cound not make move from algebraic (${orig}-${dest}): ${move.error}`)
            return move
        }
    }
    /**
     * Make a mock move on that doesn't affect current board state, returning the mock board state after the move
     * @param move
     * @return mock board state
     */
    makeMockMove (move: Move) {
        // NOTE! Don't use .copyFrom, because we don't want to push this mock board to game's board states!
        let mockBoard = Object.create(Board.prototype) as Board
        mockBoard.turn = this.turn
        mockBoard.enPassantSqr = this.enPassantSqr
        mockBoard.moveNum = this.moveNum
        mockBoard.plyNum = this.plyNum
        mockBoard.halfMoveCount = this.halfMoveCount
        mockBoard.squares = [...this.squares] // Can't copy mutable array directly
        mockBoard.castlingRights = {
            [Color.WHITE]: this.castlingRights[Color.WHITE].copy(),
            [Color.BLACK]: this.castlingRights[Color.BLACK].copy()
        }
        mockBoard.kingPos = {
            [Color.WHITE]: this.kingPos[Color.WHITE],
            [Color.BLACK]: this.kingPos[Color.BLACK]
        }
        mockBoard.history = []
        mockBoard.selectedTurnIndex = this.selectedTurnIndex
        mockBoard.posCount = new Map(this.posCount)
        mockBoard.moveCache = {
            includeFen: false,
            includeSan: false,
            moves: [],
        }
        mockBoard.makeMove(move, { isPlayerMove: false })
        // Return mock board state
        return mockBoard
    }
    /* ==========================
       Move histroy methods
       ========================== */
    /**
     * Select the move at given index in turn history
     * @param index
     * @return true on success, false on failure
     */
    selectMove (index: number) {
        // Check that index is valid
        if (index < -1 || index > this.history.length - 1) {
            Log.warn(`Attempted to select a move with invalid index: ${index}.`)
            return false
        }
        if (index === this.selectedTurnIndex) {
            // Move is already selected
            Log.info("Attempted to select a move that was already selected.")
            return true
        }
        Log.debug(`Selecting a new move from history: ${index}.`)
        // Browse to given move
        // TODO: Allow visual scrolling through the turn history step by step?
        if (index < this.selectedTurnIndex) {
            while (index < this.selectedTurnIndex) {
                this.commitUndoMoves([this.getSelectedTurn()])
                this.selectedTurnIndex--
            }
        } else if (index > this.selectedTurnIndex) {
            while (index > this.selectedTurnIndex) {
                this.selectedTurnIndex++
                this.commitMove(this.getSelectedTurn().move, false)
            }
        }
        return true
    }
    /**
     * Select the next move in turn history
     * @return true on success, false on failure
     */
    next () {
        // Check that we're not already at the end of turn history
        if (this.selectedTurnIndex === this.history.length - 1) {
            Log.warn("Could not select next move; already at the end of turn history.")
            return false
        }
        return this.selectMove(this.selectedTurnIndex + 1)
    }
    /**
     * Select the previous move in turn history
     * @return true on success, false on failure
     */
    prev () {
        // Check that we're not already at the start of turn history
        if (this.selectedTurnIndex === -1) {
            Log.warn("Could not select previous move; already at the start of turn history.")
            return false
        }
        return this.selectMove(this.selectedTurnIndex - 1)
    }
    /**
     * Get currently selected move
     * @return move
     */
    getSelectedTurn () {
        return this.history[this.selectedTurnIndex]
    }
    /**
     * Get selected move index position in turn history as [index, historyLength]
     * @return index position
     */
    getMoveIndexPosition () {
        return [this.selectedTurnIndex, this.history.length]
    }

    /*
    ========================
    Auxiliary methods
    ========================
    */

    /**
     * Get a disambiguating prefix for a SAN move, if it needs one
     * @param move
     * @return prefix, '' if none is needed
     */
    disambiguate (move: Move) {
        // Always add a file identifier to pawn captures
        if (move.movedPiece?.type === Piece.TYPE_PAWN) {
            if (move.flags?.contains(Flags.CAPTURE) || move.flags?.contains(Flags.EN_PASSANT)) {
                return Board.toAlgebraic(move.orig as number)?.charAt(0)
            } else {
                return ""
            }
        }
        const moves = this.generateMoves()
        let ambiguities = false
        let sameRank = false
        let sameFile = false
        for (let i=0; i<moves.length; i++) {
            // Check if a move by another piece of the same type ends on the same square
            // No point in doing more checks if we have determined that some other moves originate
            // from both the same rank and file
            if (move.movedPiece === moves[i].movedPiece
                && move.orig !== moves[i].orig && move.dest === moves[i].dest
                && (!sameRank || !sameFile))
            {
                ambiguities = true
                if (!sameRank && Board.rank(move.orig as number) === Board.rank(moves[i].orig as number)) {
                    sameRank = true
                }
                if (!sameFile && Board.file(move.orig as number) === Board.file(moves[i].orig as number)) {
                    sameFile = true
                }
            }
        }
        // Construct the prefix
        if (ambiguities) {
            if (sameFile && sameRank) {
                return Board.toAlgebraic(move.orig as number)
            } else if (sameFile) { // Need only the rank number
                return Board.toAlgebraic(move.orig as number)?.charAt(1)
            } else { // Need only the file letter
                return Board.toAlgebraic(move.orig as number)?.charAt(0)
            }
        }
        return ""
    }
    /**
     * Check if pieces of given color are attacking a square.
     * This can be used to check for pieces defending a square, by passing in the defender color.
     * @param color Color.WHITE or Color.BLACK
     * @param square 0x88 iondex of the target square
     * @param detailed return detailed information about the attackers
     */
    isAttacked (color: string, square: number | null, detailed = false) {
        // If target piece is not on the board, it cannot be attacked
        if (square === null) {
            return false
        }
        // Initialize an array of attackers for detailed reporting
        let attackers = []
        for (let i=Move.SQUARE_INDICES.a8; i<=Move.SQUARE_INDICES.h1; i++) {
            if (i & 0x88) {
                i += 7
                continue // Not a "physical" square
            } else if (this.squares[i] === Piece.NONE || this.squares[i].color !== color) {
                continue // Empty square or a friendly piece can't attack a square
            }
            const diff = i - square as number
            const idx = diff + 119 // On a 0x88 board
            let piece = this.squares[i]
            if (Move.ATTACKS[idx] & (1 << Move.SHIFTS[piece.type as keyof typeof Move.SHIFTS])) {
                // TODO: Find out the actual math behind this bit-wise comparison
                if (piece.type === Piece.TYPE_PAWN) {
                    // White pawn can only capture on higher and black pawn on lower rank
                    if (diff > 0 && piece.color === Color.WHITE) {
                        if (!detailed) {
                            return true
                        } else {
                            attackers.push(i)
                        }
                    } else if (diff < 0 && piece.color === Color.BLACK) {
                        if (!detailed) {
                            return true
                        } else {
                            attackers.push(i)
                        }
                    } else {
                        continue
                    }
                } else if (piece.type === Piece.TYPE_KING || piece.type === Piece.TYPE_KNIGHT) {
                    if (!detailed) {
                        return true // King or knight moves cannot be blocked
                    } else {
                        attackers.push(i)
                    }
                }
                // Do checks for blocked rays
                const offset = Move.RAYS[idx]
                let j = i + offset
                let blocked = false
                while (j !== square) {
                    if (this.squares[j] !== Piece.NONE) {
                        blocked = true // There is a piece blocking the ray to this square
                        break // Move on to check next possible attacker
                    }
                    j += offset // Continue from next square along the ray
                }
                if (!blocked) { // We know at least one piece is attacking this square
                    if (!detailed) {
                        return true
                    } else {
                        attackers.push(i)
                    }
                }
            }
        }
        //console.log(attackers.length, attackers)
        // No pieces were found that could attack this square
        if (!detailed) {
            return false
        } else { // Or return attackers
            return []
        }
    }
    /**
     * Is the king of color or player in turn in check
     */
    isInCheck (color?: string) {
        if (color === undefined) {
            return this.isAttacked(
                (this.turn === Color.WHITE ? Color.BLACK : Color.WHITE), this.kingPos[this.turn]
            )
        } else {
            return this.isAttacked(
                (color === Color.WHITE ? Color.BLACK : Color.WHITE), this.kingPos[color]
            )
        }
    }
    /**
     * Is the player to move in checkmate
     */
    isInCheckmate () {
        return (this.isInCheck() && this.generateMoves().length === 0)
    }
    /**
     * Is the player to mvoe in stale mate
     */
    isInStalemate () {
        return (!this.isInCheck() && this.generateMoves().length === 0)
    }
    /**
     * Is the game on this board a draw
     */
    isDraw (strictCheck = false) {
        // By official over-the-board rules, half move limit is 100 if a player notices it, or 150 automatically
        return (
            this.isInStalemate() || this.hasInsufficientMaterial() ||
            (strictCheck && this.hasRepeatedThreefold()) || (!strictCheck && this.hasRepeatedFivefold()) ||
            (strictCheck && this.breaks50MoveRule()) || (!strictCheck && this.breaks75MoveRule())
        )
    }
    /**
     * Check if the board has insufficient material for checkmate
     */
    hasInsufficientMaterial () {
        let pieceCount = {} as { [key: string]: number}
        let totalPieces = 0
        let bishops = []
        let sqrType = 0 // For checking which type of square a bishop is on
        for (let i=Move.SQUARE_INDICES.a8; i<=Move.SQUARE_INDICES.h1; i++) {
            if (i & 0x88) {
                i += 7
                continue // Outside the "physical" board
            }
            sqrType = (sqrType + 1)%2
            const piece = this.squares[i]
            // Piece.NONE is a special case and its type has to be fetched directly
            if (piece.type !== Piece.NONE.type) {
                pieceCount[piece.type] = ((piece.type in pieceCount) ? pieceCount[piece.type] + 1 : 1)
                if (piece.type === Piece.TYPE_BISHOP) {
                    bishops.push(sqrType)
                }
                totalPieces++
            }
        }
        // Without a question, the game has insufficient material for checkmate if:
        // - both sides have only a king
        // - one side has only a king and one has king + knight/bishop
        // - the board has only bishops (of either color) on same square type in addition to kings
        if (totalPieces === 2) {
            return true // Each side has only king remaining
        } else if (totalPieces === 3 && (pieceCount[Piece.TYPE_BISHOP] === 1 || pieceCount[Piece.TYPE_KNIGHT] === 1)) {
            return true // One side has king and the other king and bishop/knight
        } else if (totalPieces === pieceCount[Piece.TYPE_BISHOP] + 2) {
            let bSum = bishops.reduce((a, b) => a + b, 0)
            return (bSum === 0 || bSum === bishops.length)
        } else {
            return false
        }
    }
    /**
     * Check if the same position has repeated three times on this board
     */
    hasRepeatedThreefold () {
        return Array.from(this.posCount.values()).some(count => count >= 3)
    }
    /**
     * Check if the same position has repeated five times on this board (arbiter rule)
     */
    hasRepeatedFivefold () {
        return Array.from(this.posCount.values()).some(count => count >= 5)
    }
    /**
     * Check if this board breaks the 50 move rule
     */
    breaks50MoveRule () {
        return (this.halfMoveCount >= 100)
    }
    // Check if this board breaks the 75 move rule (arbiter rule)
    breaks75MoveRule () {
        return (this.halfMoveCount >= 150)
    }
    /**
     * Check if game on this board is finished
     * @param strictCheck use strick 3-fold repetition and 50-move rules
     */
    isFinished (strictCheck = false) {
        if (this.isInCheckmate()) {
            if (this.turn === Color.BLACK) {
                return {
                    result: {
                        [Color.WHITE]: Game.RESULT.WIN_BY.CHECKMATE,
                        [Color.BLACK]: Game.RESULT.LOSS_BY.CHECKMATE,
                    },
                    headers: '1-0',
                }
            } else {
                return {
                    result: {
                        [Color.WHITE]: Game.RESULT.LOSS_BY.CHECKMATE,
                        [Color.BLACK]: Game.RESULT.WIN_BY.CHECKMATE,
                    },
                    headers: '0-1',
                }
            }
        } else if (this.isInStalemate()) {
            return {
                result: {
                    [Color.WHITE]: Game.RESULT.DRAW_BY.STALEMATE,
                    [Color.BLACK]: Game.RESULT.DRAW_BY.STALEMATE,
                },
                headers: '1/2-1/2',
            }
        } else if (this.breaks75MoveRule()) {
            return {
                result: {
                    [Color.WHITE]: Game.RESULT.DRAW_BY.SEVENTYFIVE_MOVE_RULE,
                    [Color.BLACK]: Game.RESULT.DRAW_BY.SEVENTYFIVE_MOVE_RULE,
                },
                headers: '1/2-1/2',
            }
        } else if (strictCheck && this.breaks50MoveRule()) {
            return {
                result: {
                    [Color.WHITE]: Game.RESULT.DRAW_BY.FIFTY_MOVE_RULE,
                    [Color.BLACK]: Game.RESULT.DRAW_BY.FIFTY_MOVE_RULE,
                },
                headers: '1/2-1/2',
            }
        } else if (this.hasRepeatedFivefold()) {
            return {
                result: {
                    [Color.WHITE]: Game.RESULT.DRAW_BY.FIVEFOLD_REPETITION,
                    [Color.BLACK]: Game.RESULT.DRAW_BY.FIVEFOLD_REPETITION,
                },
                headers: '1/2-1/2',
            }
        } else if (strictCheck && this.hasRepeatedThreefold()) {
            return {
                result: {
                    [Color.WHITE]: Game.RESULT.DRAW_BY.THREEFOLD_REPETITION,
                    [Color.BLACK]: Game.RESULT.DRAW_BY.THREEFOLD_REPETITION,
                },
                headers: '1/2-1/2',
            }
        }
        return false
    }
    /**
     * Validate this board state, checking for possible errors.
     * @param ignoreTurn Ignore turn based checks
     * @param fixMinor Fix minor issues like castling rights
     */
    validate (ignoreTurn = false, fixMinor = false) {
        let isValid = true
        let errors = []
        // Count pieces
        let pawnCount = { w: 0, b: 0 }
        let kingCount = { w: 0, b: 0 }
        let officerCount = { w: 0, b: 0 }
        this.squares.forEach((piece) => {
            if (piece === Piece.WHITE_PAWN) {
                pawnCount.w++
            } else if (piece === Piece.BLACK_PAWN) {
                pawnCount.b++
            } else if (piece === Piece.WHITE_KING) {
                kingCount.w++
            } else if (piece === Piece.BLACK_KING) {
                kingCount.b++
            } else if (Piece.WHITE_PROMO_PIECES.indexOf(piece) > -1) {
                officerCount.w++
            } else if (Piece.BLACK_PROMO_PIECES.indexOf(piece) > -1) {
                officerCount.b++
            }
        })
        if (pawnCount.w > 8) {
            isValid = false
            errors.push("White has too many pawns on the board.")
        }
        if (pawnCount.b > 8) {
            isValid = false
            errors.push("Black has too many pawns on the board.")
        }
        if (!kingCount.w || this.kingPos[Color.WHITE] === null ||
            this.squares[this.kingPos[Color.WHITE] as number] !== Piece.WHITE_KING
        ) {
            isValid = false
            errors.push("White is missing or has a misplaced king.")
        }
        if (!kingCount.b || this.kingPos[Color.BLACK] === null ||
            this.squares[this.kingPos[Color.BLACK] as number] !== Piece.BLACK_KING
        ) {
            isValid = false
            errors.push("Black is missing or has a misplaced king.")
        }
        if (kingCount.w > 1) {
            isValid = false
            errors.push("White has too many kings on the board.")
        }
        if (kingCount.b > 1) {
            isValid = false
            errors.push("Black has too many kings on the board.")
        }
        if (pawnCount.w + officerCount.w > 15) {
            isValid = false
            errors.push("White has too many pieces on the board.")
        }
        if (pawnCount.b + officerCount.b > 15) {
            isValid = false
            errors.push("Black has too many pieces on the board.")
        }
        // TODO: Check for bishop colors (ie. all not on same color if 16 pieces on the board)
        if ((this.castlingRights[Color.WHITE].contains(Flags.KSIDE_CASTLING) ||
            this.castlingRights[Color.WHITE].contains(Flags.QSIDE_CASTLING))
            && this.pieceAt('e1') !== Piece.WHITE_KING
        ) {
            if (fixMinor) {
                this.castlingRights[Color.WHITE].clear()
            } else {
                isValid = false
                errors.push("White can't have castling rights if the king has moved.")
            }
        }
        if ((this.castlingRights[Color.BLACK].contains(Flags.KSIDE_CASTLING) ||
            this.castlingRights[Color.BLACK].contains(Flags.QSIDE_CASTLING))
            && this.pieceAt('e8') !== Piece.BLACK_KING
        ) {
            if (fixMinor) {
                this.castlingRights[Color.BLACK].clear()
            } else {
                isValid = false
                errors.push("Black can't have castling rights if the king has moved.")
            }
        }
        if (this.castlingRights[Color.WHITE].contains(Flags.KSIDE_CASTLING)
            && this.pieceAt('h1') !== Piece.WHITE_ROOK
        ) {
            if (fixMinor) {
                this.castlingRights[Color.WHITE].remove(Flags.KSIDE_CASTLING, true)
            } else {
                isValid = false
                errors.push("White can't have king-side castling rights if the rook has moved.")
            }
        }
        if (this.castlingRights[Color.WHITE].contains(Flags.QSIDE_CASTLING)
            && this.pieceAt('a1') !== Piece.WHITE_ROOK
        ) {
            if (fixMinor) {
                this.castlingRights[Color.WHITE].remove(Flags.QSIDE_CASTLING, true)
            } else {
                isValid = false
                errors.push("White can't have queen-side castling rights if the rook has moved.")
            }
        }
        if (this.castlingRights[Color.BLACK].contains(Flags.KSIDE_CASTLING)
            && this.pieceAt('h8') !== Piece.BLACK_ROOK
        ) {
            if (fixMinor) {
                this.castlingRights[Color.BLACK].remove(Flags.KSIDE_CASTLING, true)
            } else {
                isValid = false
                errors.push("Black can't have king-side castling rights if the rook has moved.")
            }
        }
        if (this.castlingRights[Color.BLACK].contains(Flags.QSIDE_CASTLING)
            && this.pieceAt('a8') !== Piece.BLACK_ROOK
        ) {
            if (fixMinor) {
                this.castlingRights[Color.BLACK].remove(Flags.QSIDE_CASTLING, true)
            } else {
                isValid = false
                errors.push("Black can't have queen-side castling rights if the rook has moved.")
            }
        }
        // Check related tests
        if (this.isInCheck(Color.WHITE) && this.isInCheck(Color.BLACK)) {
            isValid = false
            errors.push("Both kings can't be in check at the same time.")
        }
        if (!ignoreTurn && this.isInCheck(Color.swap(this.turn))) {
            isValid = false
            errors.push("Only the player in turn can have their king in check.")
        }
        return { isValid: isValid, errors: errors }
    }

    /*
    ========================
    Export methods
    ========================
    */

    /**
     * Generate an ASCII representation of the game board
     */
    toString () {
        let str = '  +------------------------+  '
        str += this.game.headers.get('black')?.substring(0, 28) || "Black (unknown)"
        str += '\n'
        const boardResult = this.isFinished()
        const result = boardResult ? boardResult.headers
                       // If this is the root variation and we're at the last move, we can override with game result value
                       : !this.id && this.selectedTurnIndex + 1 === this.history.length
                            ? this.game.headers.get('result') : false
        for (let i = Move.SQUARE_INDICES.a8; i <= Move.SQUARE_INDICES.h1; i++) {
            // Print rank number and the left side of the board
            if (Board.file(i) === 0) {
                str += '87654321'[Board.rank(i)] + ' |'
            }
            str += ' ' + this.squares[i] + ' '
            if ((i + 1) & 0x88) {
                str += `|`
                if (i === 7 && this.turn === Color.BLACK) {
                    str += `  Move ${this.moveNum}, `
                    str += result ? 'game over' : 'Black to move'
                } else if (i === 55 && result) {
                    str += '  Result:'
                } else if (i === 71 && result) {
                    str += '  ' + result
                } else if (i === 119 && this.turn === Color.WHITE) {
                    str += `  Move ${this.moveNum}, `
                    str += result ? 'game over' : 'White to move'
                }
                str += `\n`
                i += 8
            }
        }
        str += '  +------------------------+  '
        str += this.game.headers.get('white')?.substring(0, 28) || "White (unknown)"
        str += '\n'
        str += '    a  b  c  d  e  f  g  h'
        return str
    }
}
export default Board
