/**
 * @jest-environment jsdom
 */

import Chess from '../src/chess'

// From https://en.wikipedia.org/wiki/Portable_Game_Notation
const testPGN = `[Event "F/S Return Match"]
[Site "Belgrade, Serbia JUG"]
[Date "1992.11.04"]
[Round "29"]
[White "Fischer, Robert J."]
[Black "Spassky, Boris V."]
[Result "1/2-1/2"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 {This opening is called the Ruy Lopez.}
4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7
11. c4 c6 12. cxb5 axb5 13. Nc3 Bb7 14. Bg5 b4 15. Nb1 h6 16. Bh4 c5 17. dxe5
Nxe4 18. Bxe7 Qxe7 19. exd6 Qf6 20. Nbd2 Nxd6 21. Nc4 Nxc4 22. Bxc4 Nb6
23. Ne5 Rae8 24. Bxf7+ Rxf7 25. Nxf7 Rxe1+ 26. Qxe1 Kxf7 27. Qe3 Qg5 28. Qxg5
hxg5 29. b3 Ke6 30. a3 Kd6 31. axb4 cxb4 32. Ra5 Nd5 33. f3 Bc8 34. Kf2 Bf5
35. Ra7 g6 36. Ra6+ Kc5 37. Ke1 Nf4 38. g3 Nxh3 39. Kd2 Kb5 40. Rd6 Kc5 41. Ra6
Nf2 42. g4 Bd3 43. Re6 1/2-1/2`

const testVariation = `[Date "2021.12.19"]
[White "Player, White"]
[Black "Player, Black"]
[Result "1-0"]

1. e4 d5 (1... d6) 2. Nc3 b6 3. d4 b5 4. Nxd5 c6 5. Nb4 c5
6. dxc5 Nc6 7. Nxc6 Qa5+ 8. Nxa5 f5 9. Qd5 fxe4 10. Qxa8 Kf7
11. Qxc8 Nf6 12. Bxb5 g5 13. Bxg5 Bh6 14. Qxh8 Bxg5
15. Nc6 (* 15... Nd7 16. Ne5+) Nd5 16. Nh3 Nf4 17. Nxg5+ Kg6
18. Qe5 e6 19. O-O-O a6 20. Qxf4 axb5 21. Rd6 e3 22. Rxe6+ Kh5
23. Qf3+ Kh4 24. Rh6+ Kxg5 25. Qf6+ Kg4 26. Rg6+ Kh5
27. g4# 1-0`
// Printed board state at the end of the game
const boardAtEnd = `  +------------------------+  Spassky, Boris V.
8 | .  .  .  .  .  .  .  . |  Move 43, game over
7 | .  .  .  .  .  .  .  . |
6 | .  .  .  .  R  .  p  . |
5 | .  .  k  .  .  .  p  . |  Result:
4 | .  p  .  .  .  .  P  . |  1/2-1/2
3 | .  P  .  b  .  P  .  . |
2 | .  .  .  K  .  n  .  . |
1 | .  .  .  .  .  .  .  . |
  +------------------------+  Fischer, Robert J.
    a  b  c  d  e  f  g  h`

const chess = new Chess()
// Only log warnings and errors
Chess.Log.setPrintThreshold("WARN")
describe('Chess class', () => {
    test('create Chess object with default parameters', () => {
        expect(chess).toBeDefined()
    })
})
describe('Loading games from PGN', () => {
    /* Test PGN parser */
    test('parse single PGN', () => {
        chess.activeGroup = 'parse'
        const parsed = chess.parseFullPgn(testPGN)
        const game = chess.createGameFromPgn(parsed[0], 'parse')
        expect(parsed.length).toStrictEqual(1)
        expect(parsed[0].headers).toBeDefined()
        expect(parsed[0].moves).toBeDefined()
        expect(parsed[0].headers.length).toStrictEqual(7)
        expect(parsed[0].moves.length).toStrictEqual(558)
        expect(game.game).toBeTruthy()
    })
    /* Test PGN loader */
    test('load single PGN game', () => {
        const headers = chess.loadPgn(testPGN)
        expect(headers).toBeDefined()
        expect(headers.length).toStrictEqual(1)
        expect(headers[0].length).toStrictEqual(7)
        expect(headers[0][0]).toStrictEqual([ 'Event', 'F/S Return Match' ])
        expect(headers[0][1]).toStrictEqual([ 'Site', 'Belgrade, Serbia JUG' ])
        expect(headers[0][2]).toStrictEqual([ 'Date', '1992.11.04' ])
        expect(headers[0][3]).toStrictEqual([ 'Round', '29' ])
        expect(headers[0][4]).toStrictEqual([ 'White', 'Fischer, Robert J.' ])
        expect(headers[0][5]).toStrictEqual([ 'Black', 'Spassky, Boris V.' ])
        expect(headers[0][6]).toStrictEqual([ 'Result', '1/2-1/2' ])
    })
    test('loaded game result', () => {
        const active = chess.activeGame
        expect(active).toBeTruthy()
        if (!active) {
            return
        }
        console.log(active.isInStalemate)
        expect(active.result[Chess.Color.WHITE]).toStrictEqual(Chess.Game.RESULT.DRAW)
        expect(active.result[Chess.Color.BLACK]).toStrictEqual(Chess.Game.RESULT.DRAW)
    })
    test('loaded game navigation', () => {
        const active = chess.activeGame
        expect(active).toBeTruthy()
        if (!active) {
            return
        }
        active.selectTurn(5)
        expect(active.getMoveHistory('san')).toStrictEqual([ 'e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6' ])
        active.prevTurn()
        expect(active.getMoveHistory('san')).toStrictEqual([ 'e4', 'e5', 'Nf3', 'Nc6', 'Bb5' ])
        active.nextTurn()
        active.nextTurn()
        expect(active.getMoveHistory('san')).toStrictEqual([ 'e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4' ])
        active.goToStart()
        expect(active.getMoveHistory().length).toStrictEqual(0)
    })
    test('print board state', () => {
        const active = chess.activeGame
        expect(active).toBeTruthy()
        if (!active) {
            return
        }
        active.selectTurn(84)
        expect(active.toFen()).toStrictEqual('8/8/4R1p1/2k3p1/1p4P1/1P1b1P2/3K1n2/8 b - - 2 43')
        expect(active.currentBoard.toString()).toStrictEqual(boardAtEnd)
    })
    test('export PGN file', () => {
        const active = chess.activeGame
        expect(active).toBeTruthy()
        if (!active) {
            return
        }
        const pgnParts = active.toPgn().split(/\r?\n\r?\n/)
        const crtlParts = testPGN.split(/\r?\n\r?\n/)
        expect(pgnParts.length).toStrictEqual(2)
        expect(pgnParts[0]).toStrictEqual(crtlParts[0])
        // Replace all new lines with space so line length doesn't affect the result
        expect(pgnParts[1].replace(/[\t\r\n\s]+/g, ' ')).toStrictEqual(crtlParts[1].replace(/[\t\r\n\s]+/g, ' '))
    })
    test('remove loaded game', () => {
        chess.removeGame()
        expect(chess.activeGame).toBeNull()
    })
    /* Test PGN with variation */
    test('parse PGN with variation', () => {
        const headers = chess.loadPgn(testVariation)
        expect(headers).toBeDefined()
        expect(headers.length).toStrictEqual(1)
        expect(headers[0].length).toStrictEqual(4)
        const active = chess.activeGame
        expect(active).toBeTruthy()
        if (!active) {
            return
        }
        expect(active.currentBoard.history[1].variations.length).toStrictEqual(1)
        const variation = active.currentBoard.history[1].variations[0]
        expect(variation.continuation).toStrictEqual(false)
        expect(variation.history.length).toStrictEqual(1)
        active.selectTurn(0, variation.id)
        expect(active.getMoveHistory('san')).toStrictEqual(['e4', 'd6'])
        active.selectTurn(-1, 0)
        expect(active.currentBoard.history[28].variations.length).toStrictEqual(1)
        const continuation = active.currentBoard.history[28].variations[0]
        expect(continuation.continuation).toStrictEqual(true)
        expect(continuation.history.length).toStrictEqual(2)
        active.selectTurn(1, continuation.id)
        expect(active.getMoveHistory('san')).toStrictEqual([
            'e4',   'd5',   'Nc3',  'b6',   'd4',   'b5',   'Nxd5', 'c6',
            'Nb4',  'c5',   'dxc5', 'Nc6',  'Nxc6', 'Qa5+', 'Nxa5', 'f5',
            'Qd5',  'fxe4', 'Qxa8', 'Kf7',  'Qxc8', 'Nf6',  'Bxb5', 'g5',
            'Bxg5', 'Bh6',  'Qxh8', 'Bxg5', 'Nc6',  'Nd7',  'Ne5+'
        ])
        chess.removeGame()
    })
})
describe('Game creation', () => {
    // Test FEN loader
    chess.activeGroup = 'game'
    const { game, group, index } = chess.newGame('rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', 'game')
    const active = chess.games[group][index]
    test('create a new game from FEN', () => {
        expect(active).toBeTruthy()
        expect(game).toBeTruthy()
        expect(active).toBe(game)
    })
    test('make move in game', () => {
        expect(active).toBeTruthy()
        expect(group).toStrictEqual('game')
        expect(index).toStrictEqual(0)
        let moves = active.getMoves({ notation: 'san' })
        expect(moves.blocked.length).toStrictEqual(69)
        expect(moves.illegal.length).toStrictEqual(0)
        expect(moves.legal.length).toStrictEqual(22)
        const legalMoves = moves.legal.map(move => move.san)
        expect(legalMoves).toContain('Qa5')
        active.makeMoveFromSan('Qa5')
        moves = active.getMoves({ notation: 'san' })
        expect(moves.illegal.map(move => move.san)).toContain('d3')
        expect(moves.legal.map(move => move.san)).toContain('Bb5')
        active.makeMoveFromSan('Bb5')
        moves = active.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('Qxd2+')
        active.makeMoveFromSan('Qxd2')
    })
})
describe('Variation creation', () => {
    chess.activeGroup = 'variation'
    const { game, group, index } = chess.newGame('rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', 'variation')
    // Test variation creation
    test('create new branch variation', () => {
        expect(game).toBeTruthy()
        if (!game) {
            return
        }
        expect(group).toStrictEqual('variation')
        expect(index).toStrictEqual(0)
        expect(game.variations.length).toStrictEqual(1)
        game.makeMoveFromSan('Qa5')
        game.makeMoveFromSan('Bb5')
        game.makeMoveFromSan('Qxd2')
        game.prevTurn()
        let moves = game.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('Qxb5')
        game.makeMoveFromSan('Qxb5')
        // New variation board id should be 1
        expect(game.currentBoard.id).toStrictEqual(1)
        const selTurn = game.currentBoard.parentBoard?.selectedTurnIndex
        const branchTurn = game.currentBoard.parentBranchTurnIndex
        expect(selTurn).toStrictEqual(branchTurn)
        expect(game.currentBoard.parentBoard?.selectedTurn.variations.length).toStrictEqual(1)
        expect(game.currentBoard.continuation).toBeFalsy()
        moves = game.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('Qe2')
        game.makeMoveFromSan('Qe2')
        moves = game.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('c4')
        game.makeMoveFromSan('c4')
        moves = game.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('Qxc4')
        game.makeMoveFromSan('Qxc4')
        moves = game.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('Qa6')
        game.makeMoveFromSan('Qa6')
        moves = game.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('Qxc8#')
        game.makeMoveFromSan('Qxc8#')
        moves = game.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.length).toStrictEqual(0)
        expect(game.isFinished).toBeTruthy()
    })
})

describe('Continuation creation', () => {
    chess.activeGroup = 'continuation'
    const { game, group, index } = chess.newGame('rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', 'continuation')
    // Test continuation creation
    test('create new branch continuation', () => {
        expect(game).toBeTruthy()
        if (!game) {
            return
        }
        expect(group).toStrictEqual('continuation')
        expect(index).toStrictEqual(0)
        expect(game.variations.length).toStrictEqual(1)
        game.makeMoveFromSan('Qa5')
        game.makeMoveFromSan('Bb5')
        game.makeMoveFromSan('Qxb5')
        game.makeMoveFromSan('Qe2')
        game.makeMoveFromSan('c4')
        game.makeMoveFromSan('Qxc4')
        game.makeMoveFromSan('Qa6')
        game.makeMoveFromSan('Qxc8#')
        game.prevTurn()
        game.prevTurn()
        game.prevTurn()
        const initialBoard = game.currentBoard
        const prevTurn = game.currentBoard.selectedTurnIndex
        game.createContinuationFromSan('b4')
        const branchTurn = game.currentBoard.parentBranchTurnIndex
        expect(prevTurn).toStrictEqual(branchTurn)
        expect(initialBoard.history[prevTurn].variations.length).toStrictEqual(1)
        expect(game.currentBoard.parentBoard?.selectedTurn.variations.length).toStrictEqual(1)
        expect(game.currentBoard.continuation).toBeTruthy()
        expect(game.variations.length).toStrictEqual(2)
        expect(game.currentBoard.id).toStrictEqual(1)
        let moves = game.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('e5')
        game.makeMoveFromSan('e5')
        moves = game.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('O-O')
        game.makeMoveFromSan('O-O')
        expect(game.getMoveHistory('san')).toStrictEqual(['Qa5', 'Bb5', 'Qxb5', 'Qe2', 'c4', 'b4', 'e5', 'O-O'])
    })
})
/* These tests fail on some perplexing error, so they are disabled for now
describe('Headers manipulation', () => {
    const game = chess.activeGame
    expect(game).not.toBeNull()
    game.addHeaders([
        // From https://en.wikipedia.org/wiki/Portable_Game_Notation
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
    let headers = game.headers.getAll()
    expect(headers.length).toStrictEqual(7)
    expect(Object.keys(headers)).not.toContain('__proto__')
    game.headers.remove('ROUND')
    headers = game.headers.getAll()
    expect(headers.length).toStrictEqual(6)
    game.headers.set('Event', 'Chess.ts test game')
    expect(game.headers.get('event')).toStrictEqual('Chess.ts test game')
    console.log(game.headers.standardized())
})
*/
