/**
 * @jest-environment jsdom
 */

import Annotation from '../src/annotation'
import Log from 'scoped-ts-log'

// Only log warnings and errors
Log.setPrintThreshold("WARN")
describe('Simple annotation', () => {
    /* Test simple annotation */
    const annotation = new Annotation('test annotation')
    test('create an annoation', () => {
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
describe('Simple annotation', () => {
    /* Test simple annotation */
    const annotation = new Annotation('test annotation')
    test('create an annoation', () => {
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
