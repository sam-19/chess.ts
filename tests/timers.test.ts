/**
 * @jest-environment jsdom
 */

import ChessTimer, { Timers } from '../src/timers'
import Log from 'scoped-ts-log'

Log.setPrintThreshold("WARN")

describe('Time control', () => {
    const tc = new ChessTimer()
    test('create a time control instance', () => {
        expect(tc).toBeTruthy()
    })
    if (!tc) {
        return
    }
    test('start parameters parsing', async () => {
        // Bullet time controls
        const blt1Tc = new ChessTimer('10|5')
        expect(blt1Tc.fields.length).toStrictEqual(1)
        blt1Tc.startTimer()
        expect(blt1Tc.time.remaining.w).toStrictEqual(600_000)
        expect(blt1Tc.getDelay(1)).toStrictEqual(0)
        expect(blt1Tc.getIncrement(1)).toStrictEqual(5)
        const blt2Tc = new ChessTimer('15 min')
        expect(blt2Tc.fields.length).toStrictEqual(1)
        blt2Tc.startTimer()
        expect(blt2Tc.time.remaining.w).toStrictEqual(900_000)
        expect(blt2Tc.getDelay(1)).toStrictEqual(0)
        expect(blt2Tc.getIncrement(1)).toStrictEqual(0)
        // Regular time controls
        const simpleTc = new ChessTimer('600')
        expect(simpleTc.fields.length).toStrictEqual(1)
        simpleTc.startTimer()
        expect(simpleTc.time.remaining.w).toStrictEqual(600_000)
        expect(simpleTc.getDelay(1)).toStrictEqual(0)
        expect(simpleTc.getIncrement(1)).toStrictEqual(0)
        const gameTc = new ChessTimer('G/2')
        expect(gameTc.fields.length).toStrictEqual(1)
        gameTc.startTimer()
        expect(gameTc.time.remaining.w).toStrictEqual(7200_000)
        expect(gameTc.getDelay(1)).toStrictEqual(0)
        expect(gameTc.getIncrement(1)).toStrictEqual(0)
        const incrTc = new ChessTimer('60+10')
        expect(incrTc.fields.length).toStrictEqual(2)
        incrTc.startTimer()
        expect(incrTc.time.remaining.w).toStrictEqual(3600_000)
        expect(incrTc.getDelay(1)).toStrictEqual(0)
        expect(incrTc.getIncrement(1)).toStrictEqual(10)
        const delayTc = new ChessTimer('60d10')
        expect(delayTc.fields.length).toStrictEqual(2)
        delayTc.startTimer()
        expect(delayTc.time.remaining.w).toStrictEqual(3600_000)
        expect(delayTc.getDelay(1)).toStrictEqual(10)
        expect(delayTc.getIncrement(1)).toStrictEqual(0)
        const turnTc = new ChessTimer('20/60+1')
        expect(turnTc.fields.length).toStrictEqual(2)
        turnTc.startTimer()
        await new Promise<void>(resolve => {
            window.setTimeout(() => {
                resolve()
            }, 100)
        })
        expect(turnTc.time.remaining.w).toStrictEqual(3600_000)
        expect(turnTc.getDelay(1)).toStrictEqual(0)
        expect(turnTc.getIncrement(1)).toStrictEqual(1)
        for (let i=0; i<=40; i++) {
            turnTc.moveMade(i)
        }
        await new Promise<void>(resolve => {
            window.setTimeout(() => {
                resolve()
            }, 100)
        })
        const timeRem = turnTc.time.remaining.w
        // setTimeout may not be very exact, so give it some leeway
        expect(timeRem).toBeLessThan(3620_950)
        expect(timeRem).toBeGreaterThan(3620_850)
        for (let i=41; i<=50; i++) {
            turnTc.moveMade(i)
        }
        // 10 plies = five moves at 1 second each
        expect(Math.abs(turnTc.time.remaining.w-timeRem)).toBeLessThanOrEqual(5000)
        const multiTc = new ChessTimer('40/90 SD/30 d5')
        expect(multiTc.fields.length).toStrictEqual(3)
        expect(multiTc.fields[0].start).toStrictEqual(1)
        expect(multiTc.fields[0].end).toStrictEqual(null)
        expect(multiTc.fields[0].delay).toStrictEqual(5)
        expect(multiTc.fields[1].start).toStrictEqual(1)
        expect(multiTc.fields[1].end).toStrictEqual(40)
        expect(multiTc.fields[1].limit).toStrictEqual(5400)
        expect(multiTc.fields[2].start).toStrictEqual(41)
        expect(multiTc.fields[2].end).toStrictEqual(null)
        expect(multiTc.fields[2].limit).toStrictEqual(1800)
        const fideTc = new ChessTimer('40/2, SD/30 d10')
        expect(fideTc.fields.length).toStrictEqual(3)
        expect(fideTc.fields[0].start).toStrictEqual(1)
        expect(fideTc.fields[0].end).toStrictEqual(null)
        expect(fideTc.fields[0].delay).toStrictEqual(10)
        expect(fideTc.fields[1].start).toStrictEqual(1)
        expect(fideTc.fields[1].end).toStrictEqual(40)
        expect(fideTc.fields[1].limit).toStrictEqual(7200)
        expect(fideTc.fields[2].start).toStrictEqual(41)
        expect(fideTc.fields[2].end).toStrictEqual(null)
        expect(fideTc.fields[2].limit).toStrictEqual(1800)
    })
    test('field addition', () => {
        const addTc = new ChessTimer()
        addTc.addField({
            start: 1,
            end: null,
            limit: 2,
            delay: 3,
            increment: 4,
            hourglass: true
        })
        expect(addTc.fields.length).toStrictEqual(1)
        expect(addTc.fields[0].delay).toStrictEqual(3)
        expect(addTc.fields[0].end).toStrictEqual(null)
        expect(addTc.fields[0].hourglass).toStrictEqual(true)
        expect(addTc.fields[0].increment).toStrictEqual(4)
        expect(addTc.fields[0].limit).toStrictEqual(2)
        expect(addTc.fields[0].start).toStrictEqual(1)
    })
    test('timer controls', () => {
        const ctrlTc = new ChessTimer()
        ctrlTc.startTimer()
        expect(ctrlTc.pauses.length).toStrictEqual(0)
        ctrlTc.pauseTimer()
        expect(ctrlTc.pauses.length).toStrictEqual(1)
        expect(ctrlTc.pauses[0][1]).toBeNull()
        ctrlTc.continueTimer()
        expect(ctrlTc.pauses.length).toStrictEqual(1)
        expect(ctrlTc.pauses[0][1]).not.toBeNull()
    })
    test('report function', async () => {
        const fncTc = new ChessTimer()
        fncTc.setReportFunction((timers) => {
            expect(timers.elapsed?.b).toStrictEqual(0)
            expect(timers.elapsed?.w).toStrictEqual(0)
            expect(timers.remaining?.b).toStrictEqual(0)
            expect(timers.remaining?.w).toStrictEqual(0)
        })
        fncTc.updateReportTimer()
        fncTc.setReportFunction(null)
        // Artifially set White's time to a fraction of second
        fncTc.time.elapsed.w = 500
        fncTc.setReportFunction((timers) => {
            expect(timers.elapsed?.b).toStrictEqual(0)
            expect(timers.elapsed?.w).toStrictEqual(500)
            expect(timers.remaining?.b).toStrictEqual(0)
            expect(timers.remaining?.w).toStrictEqual(0)
        })
        fncTc.setReportFunction(null)
        fncTc.time.elapsed.w = 0
        fncTc.addField({
            start: 1,
            end: null,
            limit: 2,
            delay: 3,
            increment: 4.5,
            hourglass: true
        })
        fncTc.startTimer()
        fncTc.setReportFunction((timers) => {
            expect(timers.elapsed?.b).toStrictEqual(0)
            expect(timers.elapsed?.w).toBeGreaterThanOrEqual(0)
            expect(timers.remaining?.b).toStrictEqual(2000)
            expect(timers.remaining?.w).toBeLessThanOrEqual(2000)
        })
        fncTc.updateReportTimer()
        fncTc.setReportFunction(null)
        const rem = fncTc.moveMade(0) as Timers
        expect(rem.elapsed?.b).toStrictEqual(0)
        expect(rem.elapsed?.w).toStrictEqual(0)
        expect(rem.remaining?.b).toStrictEqual(2000)
        expect(rem.remaining?.w).toStrictEqual(6500)
        fncTc.setReportFunction((timers) => {
            expect(timers.elapsed?.b).toStrictEqual(rem.elapsed?.b)
            expect(timers.elapsed?.w).toBeGreaterThanOrEqual(rem.elapsed?.w)
            expect(timers.remaining?.b).toStrictEqual(rem.remaining?.b)
            expect(timers.remaining?.w).toBeLessThanOrEqual(rem.remaining?.w)
        })
        fncTc.updateReportTimer()
    })
    test('toString function', () => {
        const tostrTc = new ChessTimer('20/10 SD/300+10')
        expect(tostrTc.toString()).toStrictEqual('20/600:SD/300:+10')
    })
})
