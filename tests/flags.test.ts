/**
 * @jest-environment jsdom
 */

import Flags from '../src/flags'
import Log from 'scoped-ts-log'

Log.setPrintThreshold("WARN")

describe('Move flags', () => {
    const flags = new Flags()
    test('create empty flags', () => {
        expect(flags).toBeTruthy()
    })
    if (!flags) {
        return
    }
    test('adding flags', () => {
        flags.add(1)
        expect(flags.length).toStrictEqual(1)
        expect(flags.contains(1)).toStrictEqual(true)
        flags.add(2)
        flags.add(4)
        flags.add(8)
        flags.add(16)
        flags.add(32)
        flags.add(64)
        flags.add(128)
        flags.add(256)
        flags.add(512)
        flags.add(1024)
        flags.add(2048)
        flags.add(4096)
        expect(flags.length).toStrictEqual(13)
        Log.setPrintThreshold("DISABLE")
        flags.add(3)
        Log.setPrintThreshold("WARN")
        expect(flags.length).toStrictEqual(13)
        expect(Log.getAllEvents().filter(e => e.level === 3).length).toStrictEqual(1)
    })
    test('removing flags', () => {
        flags.remove(128)
        expect(flags.length).toStrictEqual(12)
        expect(flags.contains(128)).toStrictEqual(false)
    })
    test('replacing flags', () => {
        flags.replace(512, 128)
        expect(flags.length).toStrictEqual(12)
        expect(flags.contains(128)).toStrictEqual(true)
        expect(flags.contains(512)).toStrictEqual(false)
    })
    test('clearing flags', () => {
        flags.clear()
        expect(flags.length).toStrictEqual(0)
    })
})
