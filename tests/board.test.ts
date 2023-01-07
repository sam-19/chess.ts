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
    let board = game.currentBoard
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
        board.placePiece(board.removePiece('g3') as Piece, 'g2')
    })
    test('move generator', () => {
        const moves = board.getMoves()
        expect(moves.blocked.length).toStrictEqual(72)
        expect(moves.illegal.length).toStrictEqual(0)
        expect(moves.legal.length).toStrictEqual(20)
        expect(moves.blocked[0].algebraic).toStrictEqual('a1-a2')
        expect(moves.blocked[0].san).toStrictEqual('Ra2')
        expect(moves.blocked[0].uci).toStrictEqual('a1a2')
        expect(moves.legal[0].algebraic).toStrictEqual('a2-a3')
        expect(moves.legal[0].san).toStrictEqual('a3')
        expect(moves.legal[0].uci).toStrictEqual('a2a3')
    }),
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
        expect(board.toFen()).toStrictEqual('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2')
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
        game.selectTurn(-1, 0)
        // This continue from the previous FEN setup position
        game.makeMoveFromSan('c6')
        game.makeMoveFromSan('Bxc6')
        game.makeMoveFromSan('dxc6')
        game.makeMoveFromSan('e5')
        board = game.currentBoard
        expect(board.toFen()).toStrictEqual('rnbqkbnr/pp2pp1p/2p3p1/4P3/8/8/PPPP1PPP/RNBQK1NR b KQkq - 0 4')
        game.prevTurn()
        game.makeMoveFromSan('d4')
        board = game.currentBoard
        expect(board.parentBoard?.history[board.parentBoard.history.length - 1].variations.length).toStrictEqual(1)
        expect(board.parentBoard?.history[board.parentBoard.history.length - 1].variations[0].id).toStrictEqual(board.id)
        expect(board.parentBoard?.id).toStrictEqual(1)
        game.makeMoveFromSan('e5')
        game.makeMoveFromSan('dxe5')
        game.makeMoveFromSan('f6')
        expect(game.getMoveHistory('san').join(',')).toStrictEqual('c6,Bxc6,dxc6,d4,e5,dxe5,f6')
    })
    test('move continuation', () => {
        const curBoard = game.currentBoard
        curBoard.prevTurn()
        const curId = curBoard.id
        // This should not branch a new variation but select the pre-existing move
        game.makeMoveFromAlgebraic('f7', 'f6')
        expect(game.currentBoard.id).toStrictEqual(curId)
        curBoard.prevTurn()
        game.createContinuationFromSan('g5')
        expect(game.getMoveHistory('san').join(',')).toStrictEqual('c6,Bxc6,dxc6,d4,e5,dxe5,g5')
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
