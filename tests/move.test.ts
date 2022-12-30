/**
 * @jest-environment jsdom
 */

import Move from '../src/move'
import Log from 'scoped-ts-log'
import Piece from '../src/piece'
import Board from '../src/board'
import Game from '../src/game'
import Flags from '../src/flags'
import Color from '../src/color'

Log.setPrintThreshold("WARN")

describe('Move generator', () => {
    const move = new Move({
        orig: 0,
        dest: 16,
        detail: {},
        movedPiece: Piece.BLACK_ROOK,
        capturedPiece: null,
        promotionPiece: null,
        flags: [1]
    })
    test('create move', () => {
        expect(move).toBeTruthy()
    })
    if (!move) {
        return
    }
    test('copy move', () => {
        const move2 = Move.copyFrom(move)
        expect(move2.orig).toStrictEqual(move.orig)
        expect(move2.dest).toStrictEqual(move.dest)
    })
    const board = new Board(new Game(), 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    if (!board) {
        return
    }
    test('san creation', () => {
        expect(Move.toSan(move, board)).toStrictEqual('Ra7') // Move doesn't check its own validity
    })
    test('generate from algebraic', () => {
        const aMove = Move.generateFromAlgebraic('e2', 'e4', board) as Move
        expect(aMove.flags?.contains(Flags.DOUBLE_ADV)).toStrictEqual(true)
        expect(aMove.movedPiece.symbol).toStrictEqual(Piece.WHITE_PAWN.symbol)
    })
    test('generate from san', () => {
        const sMove = Move.generateFromSan('e4', board) as Move
        expect(sMove.flags?.contains(Flags.DOUBLE_ADV)).toStrictEqual(true)
        expect(sMove.movedPiece.symbol).toStrictEqual(Piece.WHITE_PAWN.symbol)
    })
    test('generate illegal', () => {
        const iMove = Move.generateFromSan('Qh5', board)
        expect(iMove.error).toBeDefined()
    })
    test('generate wildcard', () => {
        const wMove = Move.generateWildcardMove(board) as Move
        expect(wMove.wildcard).toStrictEqual(true)
        expect(wMove.movedPiece.color).toStrictEqual(Color.WHITE)
    })
    test('promotion move', () => {
        board.loadFen('4k3/P7/8/8/8/8/8/4K3 w KQkq - 0 1')
        const pMove = Move.generateFromAlgebraic('a7', 'a8', board) as Move
        expect(pMove.flags?.contains(Flags.PROMOTION)).toStrictEqual(true)
        expect(pMove.flags?.contains(Flags.CHECK)).toStrictEqual(true)
        expect(pMove.promotionPiece?.symbol).toStrictEqual(Piece.WHITE_QUEEN.symbol)
        expect(Move.toSan(pMove, board)).toStrictEqual('a8=Q+')
    })
})
