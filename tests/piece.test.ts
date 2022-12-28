/**
 * @jest-environment jsdom
 */

import Piece from '../src/piece'
import Log from 'scoped-ts-log'

Log.setPrintThreshold("WARN")

describe('Piece', () => {
    const piece = new Piece(Piece.WHITE_PAWN)
    test('create a piece instance', () => {
        expect(piece).toBeTruthy()
    })
    if (!piece) {
        return
    }
    test('to string', () => {
        expect(piece.toString()).toStrictEqual('P')
    })
    test('for symbol', () => {
        for (const sym of 'bBkKnNpPqQrR'.split('')) {
            expect(Piece.forSymbol(sym).symbol).toStrictEqual(sym)
        }
    })
})
