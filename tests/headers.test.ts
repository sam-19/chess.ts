/**
 * @jest-environment jsdom
 */

import Headers from '../src/headers'
import Log from 'scoped-ts-log'

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
            ['Event', 'F/S Return Match'],
            ['Site', 'Belgrade, Serbia JUG'],
            ['Date', '1992.11.04'],
            ['Round', '29'],
            ['White', 'Fischer, Robert J.'],
            ['Black', 'Spassky, Boris V.'],
            ['Result', '1/2-1/2'],
            // Malicious header
            ['__proto__', 'doSomethingEvil()']
        ])
        expect(headers.getKey(0)).toStrictEqual('Event')
        expect(headers.getValue(0)).toStrictEqual('F/S Return Match')
    })
    test('get headers', () => {
        const all = headers.getAll()
        expect(Object.keys(all).length).toStrictEqual(7)
        expect(Object.keys(all)).not.toContain('__proto__')
    })
    test('export headers', () => {
        headers.add([['FEN', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']])
        expect(headers.export(true)?.size).toStrictEqual(7)
        expect(headers.export()?.size).toStrictEqual(8)
    })
    test('modify headers', () => {
        headers.set('Event', 'Chess.ts test game')
        expect(headers.get('event')).toStrictEqual('Chess.ts test game')
    })
    test('remove headers', () => {
        headers.remove('ROUND')
        expect(Object.keys(headers.getAll()).length).toStrictEqual(7)
        headers.removeAllExcept('Result')
        expect(Object.keys(headers.getAll()).length).toStrictEqual(1)
    })
})
