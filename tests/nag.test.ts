import { describe, expect, test } from 'vitest'
import Nag from '../src/nag.js'
import { Log } from '../src/log.js'

Log.setPrintThreshold("WARN")

describe('Number annoation glyphs', () => {
    const nag = new Nag(0)
    test('create a NAG instance', () => {
        expect(nag).toBeTruthy()
    })
    if (!nag) {
        return
    }
    test('NAG list', () => {
        expect(Nag.LIST.length).toStrictEqual(140)
    })
    test('for code', () => {
        expect(Nag.forCode(1)?.symbol).toStrictEqual(Nag.LIST[1].symbol)
    })
    test('for symbol', () => {
        expect(Nag.forSymbol('!')?.code).toStrictEqual(1)
    })
})
