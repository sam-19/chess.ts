/**
 * @jest-environment jsdom
 */

import Annotation from '../src/annotation'
import Log from 'scoped-ts-log'

// Only log warnings and errors
Log.setPrintThreshold("WARN")
describe('Simple annotation', () => {
    const annotation = new Annotation('test annotation')
    test('create the annoation', () => {
        expect(annotation).toBeDefined()
    })
    test('get annotation full text', () => {
        expect(annotation.fullText).toStrictEqual('test annotation')
    })
    test('get annotation clean text', () => {
        expect(annotation.cleanText).toStrictEqual('test annotation')
    })
    test('get annotation text parts', () => {
        expect(annotation.textParts.length).toStrictEqual(1)
    })
})
describe('NAG annotation', () => {
    const annotation = new Annotation('nag annotation', 4)
    test('create the annoation', () => {
        expect(annotation).toBeDefined()
    })
    test('get annotation full text', () => {
        expect(annotation.fullText).toStrictEqual('')
    })
    test('get annotation clean text', () => {
        expect(annotation.cleanText).toStrictEqual('')
    })
    test('get annotation text parts', () => {
        expect(annotation.textParts.length).toStrictEqual(0)
    })
    test('get annotation NAG', () => {
        expect(annotation.nag?.code).toStrictEqual(4)
        expect(annotation.nag?.value?.description).toStrictEqual('blunder')
    })
})
describe('Complex annotation', () => {
    const annotation = new Annotation('This annotation has [%clk 0:15:12]a timer and [%csl a4 a move comment].')
    test('create the annoation', () => {
        expect(annotation).toBeDefined()
    })
    test('get annotation full text', () => {
        expect(annotation.fullText).toStrictEqual("This annotation has [%clk 0:15:12]a timer and [%csl a4 a move comment].")
    })
    test('get annotation clean text', () => {
        expect(annotation.cleanText).toStrictEqual("This annotation has a timer and a move comment.")
    })
    test('get annotation text parts', () => {
        expect(annotation.textParts.length).toStrictEqual(5)
        expect(annotation.textParts[0].text).toStrictEqual("This annotation has ")
        expect(annotation.textParts[1].command).toStrictEqual("clk")
        expect(annotation.textParts[2].text).toStrictEqual("a timer and ")
        expect(annotation.textParts[3].command).toStrictEqual("csl")
        expect(annotation.textParts[3].text).toStrictEqual("a move comment")
        expect(annotation.textParts[4].text).toStrictEqual(".")
    })
})
