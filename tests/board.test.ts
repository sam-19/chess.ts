/**
 * @jest-environment jsdom
 */

import Board from '../src/board'
import Game from '../src/game'
import Log from 'scoped-ts-log'
import Flags from '../src/flags'
import Turn from '../src/turn'

// Only log warnings and errors
Log.setPrintThreshold("WARN")
const game = new Game()
expect(game).toBeDefined()
describe('Board creation', () => {
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
    test('make moves', () => {
        board.makeMoveFromAlgebraic('e2', 'e4')
        expect(board.enPassantSqr).toStrictEqual(84)
        expect(Board.squareToAlgebraic(board.enPassantSqr as number)).toStrictEqual('e3')
        expect(board.history.length).toStrictEqual(1)
        expect(board.plyNum).toStrictEqual(1)
        expect(board.posCount.size).toStrictEqual(1)
        expect(board.getMoves({ notation: 'san' }).legal.map(m => m.san)).toContain('d5')
        board.makeMoveFromSAN('d5')
        expect(board.getMoves({ notation: 'san' }).legal.map(m => m.move)).toContain('exd5')
        board.makeMoveFromSAN('exd5')
        const lastMove = (board.undoMoves() as Turn[])[0]
        expect(lastMove.move.flags.contains(Flags.CAPTURE)).toStrictEqual(true)
        expect(board.toFen()).toStrictEqual('rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2')
    })
    test('move variations', () => {
        board.makeMoveFromSAN('d4')
        board.makeMoveFromSAN('e5')
        board.makeMoveFromSAN('dxe5')
        board.makeMoveFromSAN('dxe4')
        board.prevTurn()
        board.makeMoveFromSAN('d4')
        expect(board.toFen()).toStrictEqual('rnbqkbnr/ppp2ppp/8/4P3/4p3/8/PPP2PPP/RNBQKBNR w KQkq - 0 4')
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
    test('move continuations', () => {
        const curBoard = game.currentBoard
        curBoard.prevTurn()
        const curId = curBoard.id
        // This should not branch a new variation but select the pre-existing move
        const move = game.makeMoveFromAlgebraic('e5', 'f6')
        expect(game.currentBoard.id).toStrictEqual(curId)
        curBoard.prevTurn()
        game.createContinuationFromSan('e6')
        expect(game.getMoveHistory('san').join(',')).toStrictEqual('e4,d5,d4,e5,dxe5,d4,b3,f5,e6')
    })
})
