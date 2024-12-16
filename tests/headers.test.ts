/**
 * @jest-environment jsdom
 */

import Headers from '../src/headers'
import { Log } from 'scoped-event-log'

Log.setPrintThreshold("WARN")

describe('Game headers', () => {
    const headers = new Headers()
    test('create empty headers', () => {
        expect(headers).toBeTruthy()
    })
    if (!headers) {
        return
    }
    test('add headers', () => {
        headers.add([
            // From http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c2.3
            ['Event', 'Test Event'],
            ['Site', 'Test site'],
            ['Date', '1999.12.31'],
            ['Round', '30'],
            ['White', 'Player, White'],
            ['Black', 'Player, Black'],
            ['Result', '1/2-1/2'],
            // Optional headers
            ['WhiteElo', '2100'],
            ['BlackElo', '900'],
            ['Time', '19:30'],
            ['PlyCount', '60'],
            ['Termination', 'normal'],
            ['ECO', 'C59'],
            // Malicious header
            ['__proto__', 'doSomethingEvil()']
        ])
        expect(headers.getKey(0)).toStrictEqual('Event')
        expect(headers.getValue(0)).toStrictEqual('Test Event')
    })
    test('get headers', () => {
        const all = headers.getAll()
        expect(Object.keys(all).length).toStrictEqual(13)
        expect(Object.keys(all)).not.toContain('__proto__')
    })
    test('export headers', () => {
        headers.add([['FEN', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']])
        expect(headers.export(true)?.size).toStrictEqual(7)
        expect(headers.export()?.size).toStrictEqual(14)
    })
    test('modify headers', () => {
        headers.set('Event', 'typescript-chess test game')
        expect(headers.get('event')).toStrictEqual('typescript-chess test game')
    })
    test('remove headers', () => {
        headers.remove('ROUND')
        expect(Object.keys(headers.getAll()).length).toStrictEqual(13)
        headers.removeAllExcept('Result')
        expect(Object.keys(headers.getAll()).length).toStrictEqual(1)
    })
})
