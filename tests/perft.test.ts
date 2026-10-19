import { describe, expect, test } from 'vitest'
import Board from '../src/board.js'
import Game from '../src/game.js'
import { Log } from '../src/log.js'
import Move from '../src/move.js'

// Perft (performance test) counts all legal move sequences to a given depth and compares the
// result to known values. It exercises castling, en passant, promotions, pins and checks.
// Positions and node counts from https://www.chessprogramming.org/Perft_Results

Log.setPrintThreshold("DISABLE")

const perft = (board: Board, depth: number): number => {
    const moves = [...board.generateMoves({ onlyLegal: true })] as Move[]
    if (depth === 1) {
        return moves.length
    }
    let nodes = 0
    for (const move of moves) {
        board.makeMove(move, { isPlayerMove: false, preserveGame: false })
        nodes += perft(board, depth - 1)
        board.undoMoves()
    }
    return nodes
}

const boardFromFen = (fen: string) => {
    const game = new Game()
    game.loadFen(fen)
    return game.currentBoard
}

const POSITIONS: { name: string, fen: string, counts: number[] }[] = [
    {
        name: 'initial position',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        counts: [20, 400, 8902],
    },
    {
        name: 'kiwipete',
        fen: 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
        counts: [48, 2039],
    },
    {
        name: 'position 3 (en passant, pins)',
        fen: '8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1',
        counts: [14, 191, 2812],
    },
    {
        name: 'position 4 (promotions, castling)',
        fen: 'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
        counts: [6, 264, 9467],
    },
    {
        name: 'position 4 mirrored',
        fen: 'r2q1rk1/pP1p2pp/Q4n2/bbp1p3/Np6/1B3NBn/pPPP1PPP/R3K2R b KQ - 0 1',
        counts: [6, 264, 9467],
    },
    {
        name: 'position 5',
        fen: 'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
        counts: [44, 1486],
    },
]

describe('Perft', () => {
    for (const { name, fen, counts } of POSITIONS) {
        test.each(counts.map((count, i) => [i + 1, count]))(`${name}, depth %i`, (depth, count) => {
            const board = boardFromFen(fen)
            expect(perft(board, depth)).toStrictEqual(count)
            // Board must be restored to its original state
            expect(board.toFen()).toStrictEqual(fen)
        })
    }
})
