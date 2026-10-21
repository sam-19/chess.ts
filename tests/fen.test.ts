import { describe, expect, test } from 'vitest'
import Fen from '../src/fen.js'
import { Log } from '../src/log.js'

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
    test('castling rights need the king and rook on their original squares', () => {
        const valid = (fen: string) => Fen.Validate(fen)
        expect(valid('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1').isValid).toStrictEqual(true)
        expect(valid('4k3/8/8/8/8/8/8/R3K3 w Q - 0 1').isValid).toStrictEqual(true)
        // No rook on h1
        expect(valid('4k3/8/8/8/8/8/8/R3K3 w KQ - 0 1').errorCode).toStrictEqual(19)
        // The king has left e8
        expect(valid('r2k3r/8/8/8/8/8/8/4K3 w kq - 0 1').errorCode).toStrictEqual(19)
        // A black rook on a white home square does not count
        expect(valid('4k3/8/8/8/8/8/8/r3K3 w Q - 0 1').errorCode).toStrictEqual(19)
        // Only the position is validated: no castling field
        expect(Fen.Validate('4k3/8/8/8/8/8/8/4K3', true).isValid).toStrictEqual(true)
    })
    test('the player not in turn cannot be in check', () => {
        const code = (fen: string) => Fen.Validate(fen).errorCode
        // The player in turn may be in check
        expect(code('k7/8/8/8/8/8/8/K6q w - - 0 1')).toStrictEqual(0)
        // Rook, bishop, queen, knight, pawn and king attacks on the king not in turn
        expect(code('k6R/8/8/8/8/8/8/K7 w - - 0 1')).toStrictEqual(20)
        expect(code('k7/8/8/8/8/8/8/K6B w - - 0 1')).toStrictEqual(20)
        expect(code('k7/8/8/8/8/8/8/K6Q w - - 0 1')).toStrictEqual(20)
        expect(code('k7/2N5/8/8/8/8/8/K7 w - - 0 1')).toStrictEqual(20)
        expect(code('k7/1P6/8/8/8/8/8/K7 w - - 0 1')).toStrictEqual(20)
        expect(code('8/8/8/8/8/8/1p6/K6k b - - 0 1')).toStrictEqual(20)
        // A blocked line is no check; a pawn does not attack straight ahead
        expect(code('k5NR/8/8/8/8/8/8/K7 w - - 0 1')).toStrictEqual(0)
        expect(code('k7/P7/8/8/8/8/8/K7 w - - 0 1')).toStrictEqual(0)
        // The same for black attacking the white king
        expect(code('k7/8/8/8/8/8/8/K6r b - - 0 1')).toStrictEqual(20)
        expect(code('k7/8/8/8/8/8/1p6/K7 b - - 0 1')).toStrictEqual(20)
    })
})
