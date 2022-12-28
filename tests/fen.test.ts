/**
 * @jest-environment jsdom
 */

import Fen from '../src/fen'
import Log from 'scoped-ts-log'

Log.setPrintThreshold("WARN")

describe('Fen validation', () => {
    const FEN = new Fen()
    test('create a FEN object', () => {
        expect(FEN).toBeTruthy()
    })
    if (!FEN) {
        return
    }
    test('default starting FEN', () => {
        expect(FEN.fen).toStrictEqual('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
        expect(FEN.toString()).toStrictEqual(FEN.fen)
    })
    test('inverted FEN', () => {
        expect(FEN.invert()).toStrictEqual('RNBKQBNR/PPPPPPPP/8/8/8/8/pppppppp/rnbkqbnr w KQkq - 0 1')
    })
    test('FEN validation', () => {
        const testFENs = [
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            [
                'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR',
                'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq- 0 1',
                'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w'
            ],
            'rnbqkbnr/pppppppp/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            'rnbqkbnr/pppppppp/8/8/62/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            'rnbqkbnr/pppppppp/8/8/8/8/PSPPPPPP/RNBQKBNR w KQkq - 0 1',
            'rnbqkbnr/p2pppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 0',
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - x 1',
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq f2 0 1',
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w kQkq - 0 1',
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR x KQkq - 0 1',
            'rnbqkbnr/pppppppp/8/8/8/1N6/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            'rnbqkbnr/pppppppp/1b6/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            'rnbqkbnr/pppppppp/8/8/8/1P6/PPPPPPPP/R1BQKBNR w KQkq - 0 1',
            'rnbqk1nr/pppppppp/3p4/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBKKBNR w KQkq - 0 1',
            'rnbkkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        ]
        for (let i=0; i<testFENs.length; i++) {
            if (i === 1) {
                FEN.fen = testFENs[i][0]
                const v0 = FEN.validate(true)
                expect(v0.isValid).toStrictEqual(true)
                FEN.fen = testFENs[i][1]
                const v1 = FEN.validate()
                expect(v1.isValid).toStrictEqual(false)
                expect(v1.errorCode).toStrictEqual(i)
                FEN.fen = testFENs[i][2]
                const v2 = FEN.validate(true)
                expect(v2.isValid).toStrictEqual(false)
                expect(v2.errorCode).toStrictEqual(i)
            } else {
                FEN.fen = testFENs[i] as string
                const v = FEN.validate()
                if (!i) {
                    expect(v.isValid).toStrictEqual(true)
                } else {
                    expect(v.isValid).toStrictEqual(false)
                    expect(v.errorCode).toStrictEqual(i)
                }
            }
        }
    })
})
