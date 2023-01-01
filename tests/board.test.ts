/**
 * @jest-environment jsdom
 */

import Board from '../src/board'
import Game from '../src/game'
import Log from 'scoped-ts-log'
import Flags from '../src/flags'
import Turn from '../src/turn'
import Piece from '../src/piece'
import Fen from '../src/fen'

// Only log warnings and errors
Log.setPrintThreshold("WARN")
const game = new Game()
expect(game).toBeDefined()
describe('Board', () => {
    const board = game.currentBoard
    test('board exists', () => {
        expect(board).toBeDefined()
    })
    test('default board state', () => {
        expect(board.toFen()).toStrictEqual('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    })
    test('check initial properties', () => {
        expect(board.breaks50MoveRule).toStrictEqual(false)
        expect(board.breaks75MoveRule).toStrictEqual(false)
        expect(board.castlingRights.b.contains(Flags.KSIDE_CASTLING)).toStrictEqual(true)
        expect(board.castlingRights.b.contains(Flags.QSIDE_CASTLING)).toStrictEqual(true)
        expect(board.castlingRights.w.contains(Flags.KSIDE_CASTLING)).toStrictEqual(true)
        expect(board.castlingRights.w.contains(Flags.QSIDE_CASTLING)).toStrictEqual(true)
        expect(board.continuation).toStrictEqual(false)
        expect(board.enPassantSqr).toStrictEqual(null)
        expect(board.endResult).toStrictEqual(null)
        expect(board.halfMoveCount).toStrictEqual(0)
        expect(board.hasInsufficientMaterial).toStrictEqual(false)
        expect(board.hasRepeatedFivefold).toStrictEqual(false)
        expect(board.hasRepeatedThreefold).toStrictEqual(false)
        expect(board.history.length).toStrictEqual(0)
        expect(board.isDraw).toStrictEqual(false)
        expect(board.isFinished).toStrictEqual(false)
        expect(board.isInCheck).toStrictEqual(false)
        expect(board.isInCheckmate).toStrictEqual(false)
        expect(board.isInStalemate).toStrictEqual(false)
        expect(board.isMock).toStrictEqual(false)
        expect(board.kingPos.b).toStrictEqual(4)
        expect(board.kingPos.w).toStrictEqual(116)
        expect(board.plyNum).toStrictEqual(0)
        expect(board.posCount.size).toStrictEqual(1)
        expect(board.selectedTurnIndex).toStrictEqual(-1)
        expect(board.turnIndexPosition).toStrictEqual([-1, 0])
        expect(board.turnNum).toStrictEqual(1)
    })
    test('basic methods', () => {
        const piece = board.removePiece('g2') as Piece
        board.placePiece(piece, 'g3')
        expect(board.pieceAt('g3').symbol).toStrictEqual(Piece.WHITE_PAWN.symbol)
    })
    test('make moves', () => {
        board.makeMoveFromAlgebraic('e2', 'e4')
        expect(board.enPassantSqr).toStrictEqual(84)
        expect(Board.squareToAlgebraic(board.enPassantSqr as number)).toStrictEqual('e3')
        expect(board.history.length).toStrictEqual(1)
        expect(board.plyNum).toStrictEqual(1)
        expect(board.posCount.size).toStrictEqual(1)
        expect(board.getMoves({ notation: 'san' }).legal.map(m => m.san)).toContain('d5')
        board.makeMoveFromSAN('d5')
        expect(board.getMoves({ notation: 'san' }).legal.map(m => m.move.san)).toContain('exd5')
        board.makeMoveFromSAN('exd5')
        const lastMove = (board.undoMoves() as Turn[])[0]
        expect(lastMove.move.flags.contains(Flags.CAPTURE)).toStrictEqual(true)
        expect(board.toFen()).toStrictEqual('rnbqkbnr/ppp1pppp/8/3p4/4P3/6P1/PPPP1P1P/RNBQKBNR w KQkq d6 0 2')
        game.loadFen('rnbqkbnr/pppppp1p/6p1/1B6/4P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2')
        const moves = game.getMoves({ detailed: true })
        expect(moves.illegal.map(m => m.san)).toContain('d6')
        for (const move of moves.illegal) {
            if (move.san === 'd6') {
                expect((move.move.detail.get('attackers') as string[])).toContain('b5')
            }
        }
    })
    test('move variations', () => {
        board.makeMoveFromSAN('d4')
        board.makeMoveFromSAN('e5')
        board.makeMoveFromSAN('dxe5')
        board.makeMoveFromSAN('dxe4')
        board.prevTurn()
        board.makeMoveFromSAN('d4')
        expect(board.toFen()).toStrictEqual('rnbqkbnr/ppp2ppp/8/4P3/4p3/6P1/PPP2P1P/RNBQKBNR w KQkq - 0 4')
        //expect(board.parentBoard?.id).toStrictEqual(0)
        expect(board.history[board.history.length - 1].variations.length).toStrictEqual(1)
        expect(board.history[board.history.length - 1].variations[0].parentBranchTurnIndex).toStrictEqual(5)
        // Switch to the first move of the first variation
        game.selectTurn(0, 1)
        const varBoard = game.currentBoard
        expect(varBoard.parentBoard?.id).toStrictEqual(0)
        varBoard.makeMoveFromSAN('e6')
        varBoard.makeMoveFromSAN('fxe6')
        varBoard.prevTurn()
        varBoard.prevTurn()
        game.makeMoveFromSan('b3')
        game.makeMoveFromSan('f5')
        game.makeMoveFromSan('exf6')
        expect(game.getMoveHistory('san').join(',')).toStrictEqual('e4,d5,d4,e5,dxe5,d4,b3,f5,exf6')
    })
    test('move continuation', () => {
        const curBoard = game.currentBoard
        curBoard.prevTurn()
        const curId = curBoard.id
        // This should not branch a new variation but select the pre-existing move
        game.makeMoveFromAlgebraic('e5', 'f6')
        expect(game.currentBoard.id).toStrictEqual(curId)
        curBoard.prevTurn()
        game.createContinuationFromSan('e6')
        expect(game.getMoveHistory('san').join(',')).toStrictEqual('e4,d5,d4,e5,dxe5,d4,b3,f5,e6')
    })
    test('board validation', () => {
        const valBoard = new Board(game)
        const setup1 = valBoard.validate()
        expect(setup1.isValid).toStrictEqual(false)
        expect(setup1.errors.length).toStrictEqual(8)
        valBoard.placePiece(Piece.BLACK_KING, 'e8')
        const setup2 = valBoard.validate()
        expect(setup2.errors.length).toStrictEqual(6)
        valBoard.placePiece(Piece.WHITE_KING, 'e1')
        const setup3 = valBoard.validate()
        expect(setup3.errors.length).toStrictEqual(4)
        valBoard.placePiece(Piece.WHITE_ROOK, 'a1')
        valBoard.placePiece(Piece.WHITE_ROOK, 'h1')
        const setup4 = valBoard.validate()
        expect(setup4.errors.length).toStrictEqual(2)
        const setup5 = valBoard.validate(false, true)
        expect(setup5.errors.length).toStrictEqual(0)
        expect(valBoard.castlingRights.b.length).toStrictEqual(0)
        expect(valBoard.castlingRights.w.length).toStrictEqual(2)
        valBoard.loadFen(Fen.DEFAULT_STARTING_STATE)
        valBoard.placePiece(Piece.WHITE_PAWN, 'a4')
        const setup6 = valBoard.validate()
        expect(setup6.errors.length).toStrictEqual(2)
    })
    test('static properties', () => {
        for (const [kIdx, vIdx] of Object.entries(Board.SQUARE_INDICES)) {
            switch (kIdx[0]) {
                case 'a':
                    expect(Board.fileOf(vIdx)).toStrictEqual(0)
                    break
                case 'b':
                    expect(Board.fileOf(vIdx)).toStrictEqual(1)
                    break
                case 'c':
                    expect(Board.fileOf(vIdx)).toStrictEqual(2)
                    break
                case 'd':
                    expect(Board.fileOf(vIdx)).toStrictEqual(3)
                    break
                case 'e':
                    expect(Board.fileOf(vIdx)).toStrictEqual(4)
                    break
                case 'f':
                    expect(Board.fileOf(vIdx)).toStrictEqual(5)
                    break
                case 'g':
                    expect(Board.fileOf(vIdx)).toStrictEqual(6)
                    break
                case 'h':
                    expect(Board.fileOf(vIdx)).toStrictEqual(7)
                    break
            }
            switch (kIdx[1]) {
                case '1':
                    expect(Board.rankOf(vIdx)).toStrictEqual(7)
                    break
                case '2':
                    expect(Board.rankOf(vIdx)).toStrictEqual(6)
                    break
                case '3':
                    expect(Board.rankOf(vIdx)).toStrictEqual(5)
                    break
                case '4':
                    expect(Board.rankOf(vIdx)).toStrictEqual(4)
                    break
                case '5':
                    expect(Board.rankOf(vIdx)).toStrictEqual(3)
                    break
                case '6':
                    expect(Board.rankOf(vIdx)).toStrictEqual(2)
                    break
                case '7':
                    expect(Board.rankOf(vIdx)).toStrictEqual(1)
                    break
                case '8':
                    expect(Board.rankOf(vIdx)).toStrictEqual(0)
                    break
            }
            for (const [kName, vName] of Object.entries(Board.SQUARE_NAMES)) {
                if (kIdx === vName) {
                    expect(vIdx).toStrictEqual(parseInt(kName))
                } else {
                    const dst = Board.distanceBetween(kIdx, vName)
                    expect(dst).toBeGreaterThan(0)
                    expect(dst).toStrictEqual(Board.distanceBetween(parseInt(kName), vIdx))
                }
            }
        }
    })
})
