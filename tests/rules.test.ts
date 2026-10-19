import { describe, expect, test } from 'vitest'
import Game from '../src/game.js'
import { Log } from '../src/log.js'
import Move from '../src/move.js'

Log.setPrintThreshold("DISABLE")

const boardFromFen = (fen: string) => {
    const game = new Game()
    game.loadFen(fen)
    return game.currentBoard
}

describe('Castling legality', () => {
    const castlingMoves = (fen: string) => {
        return (boardFromFen(fen).generateMoves({ onlyLegal: true }) as Move[])
            .filter(m => m.uci === 'e8g8' || m.uci === 'e8c8')
            .map(m => m.uci)
            .sort()
    }
    test('cannot castle out of check', () => {
        expect(castlingMoves('r3k2r/8/8/8/4R3/8/8/4K3 b kq - 0 1')).toStrictEqual([])
    })
    test('cannot castle through an attacked square', () => {
        expect(castlingMoves('r3k2r/8/8/8/8/8/8/3RK3 b kq - 0 1')).toStrictEqual(['e8g8'])
        expect(castlingMoves('r3k2r/8/8/8/8/8/8/4KR2 b kq - 0 1')).toStrictEqual(['e8c8'])
    })
    test('can castle when only the rook passes an attacked square', () => {
        expect(castlingMoves('r3k2r/8/8/8/8/8/8/1R2K3 b kq - 0 1')).toStrictEqual(['e8c8', 'e8g8'])
    })
})

describe('En passant', () => {
    test.each([
        ['white', 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq f6 0 3', 'exf6'],
        ['black', 'rnbqkbnr/ppp1pppp/8/8/2Pp4/5N2/PP1PPPPP/RNBQKB1R b KQkq c3 0 3', 'dxc3'],
    ])('undoing a capture by %s restores the board', (_color, fen, san) => {
        const game = new Game()
        game.loadFen(fen)
        const board = game.currentBoard
        board.makeMoveFromSAN(san, { isPlayerMove: false })
        expect(board.toFen()).not.toStrictEqual(fen)
        board.undoMoves()
        expect(board.toFen()).toStrictEqual(fen)
    })
})

describe('Repetition', () => {
    const shuffle = ['Nf3', 'Nf6', 'Ng1', 'Ng8']
    test('threefold repetition is detected', () => {
        const board = new Game().currentBoard
        for (const san of [...shuffle, ...shuffle.slice(0, 3)]) {
            board.makeMoveFromSAN(san, { isPlayerMove: false })
            expect(board.hasRepeatedThreefold).toStrictEqual(false)
        }
        // Initial position on the board for the third time
        board.makeMoveFromSAN('Ng8', { isPlayerMove: false })
        expect(board.hasRepeatedThreefold).toStrictEqual(true)
    })
    test('undoing moves restores repetition counts', () => {
        const board = new Game().currentBoard
        for (const san of [...shuffle, ...shuffle]) {
            board.makeMoveFromSAN(san, { isPlayerMove: false })
        }
        expect(board.hasRepeatedThreefold).toStrictEqual(true)
        board.undoMoves()
        expect(board.hasRepeatedThreefold).toStrictEqual(false)
        // Taking back and replaying a move must not count the position twice
        board.makeMoveFromSAN('Ng8', { isPlayerMove: false })
        board.undoMoves()
        board.makeMoveFromSAN('Ng8', { isPlayerMove: false })
        expect(board.posCount.get(board.positionKey)).toStrictEqual(3)
    })
})
