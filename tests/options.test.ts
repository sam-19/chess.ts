import { describe, expect, test } from 'vitest'
import Options from '../src/options.js'
import { Log } from '../src/log.js'

Log.setPrintThreshold("WARN")

describe('Options', () => {
    const opts = new Options({})
    test('create an options instance', () => {
        expect(opts).toBeTruthy()
    })
    if (!opts) {
        return
    }
    test('board defaults', () => {
        expect(Options.Board.branchFromParent()).toBeTruthy()
        expect(Options.Board.generateMoves()).toBeTruthy()
        expect(Options.Board.getMoves()).toBeTruthy()
        expect(Options.Board.makeMove()).toBeTruthy()
        expect(Options.Board.toFen()).toBeTruthy()
    })
    test('chess defaults', () => {
        expect(Options.Chess.loadPgn()).toBeTruthy()
        expect(Options.Chess.loadPgnInBatches()).toBeTruthy()
    })
    test('game defaults', () => {
        expect(Options.Game.getCapturedPieces()).toBeTruthy()
        expect(Options.Game.makeMove()).toBeTruthy()
        expect(Options.Game.toPgn()).toBeTruthy()
    })
    test('move defaults', () => {
        expect(Options.Move.sloppySAN).toBeDefined()
    })
    test('time control defaults', () => {
        expect(Options.ChessTimer.autoTimeout).toBeDefined()
    })
})
