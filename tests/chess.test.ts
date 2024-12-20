/**
 * @jest-environment jsdom
 */

import Chess, { Color } from '../src'

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
describe('Loading and exporting PGN', () => {
    /* Test PGN loader */
    test('load single PGN game', () => {
        chess.activeGroup = 'parse'
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
        expect(active.result).toStrictEqual('1/2-1/2')
    })
    test('remove loaded game', () => {
        chess.removeGame()
        expect(chess.activeGame).toBeNull()
    })
    /* Test PGN parser */
    test('parse simple PGN', () => {
        const parsed = chess.parseFullPgn('1. e4')
        chess.createGameFromParsed(parsed[0], 'parse')
        chess.removeGame()
    })
    test('parse full PGN', () => {
        const parsed = chess.parseFullPgn(testPGN)
        const game = chess.createGameFromParsed(parsed[0], 'parse')
        expect(parsed.length).toStrictEqual(1)
        expect(parsed[0].headers).toBeDefined()
        expect(parsed[0].moves).toBeDefined()
        expect(parsed[0].headers.length).toStrictEqual(7)
        expect(parsed[0].moves.length).toStrictEqual(558)
        expect(game.game).toBeTruthy()
    })
    test('FEN and ASCII match expected board state', () => {
        const active = chess.activeGame
        expect(active).toBeTruthy()
        if (!active) {
            return
        }
        active.selectTurn(84)
        expect(active.toFen()).toStrictEqual('8/8/4R1p1/2k3p1/1p4P1/1P1b1P2/3K1n2/8 b - - 2 43')
        expect(active.currentBoard.toString()).toStrictEqual(boardAtEnd)
    })
    test('Exported PGN matches expected board state', () => {
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
    test('clear all loaded games', () => {
        chess.clearAllGames()
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
describe('Pass-through properties', () => {
    test('game setup', () => {
        chess.activeGroup = 'properties'
        expect(chess.newGame()).toBeTruthy()
        expect(chess.makeMoveFromSan).toBeDefined()
        chess.makeMoveFromSan('e4')
    })
    test('get properties', () => {
        expect(chess.breaks50MoveRule).toStrictEqual(false)
        expect(chess.breaks75MoveRule).toStrictEqual(false)
        expect(chess.currentMoveVariations).toStrictEqual([])
        expect(chess.endState?.header).toStrictEqual('*')
        expect(chess.hasEnded).toStrictEqual(false)
        expect(chess.hasInsufficientMaterial).toStrictEqual(false)
        expect(chess.hasRepeatedFivefold).toStrictEqual(false)
        expect(chess.hasRepeatedThreefold).toStrictEqual(false)
        expect(chess.isDraw).toStrictEqual(false)
        expect(chess.isFinished).toStrictEqual(false)
        expect(chess.isInCheck).toStrictEqual(false)
        expect(chess.isInCheckmate).toStrictEqual(false)
        expect(chess.isInStalemate).toStrictEqual(false)
        expect(chess.isPaused).toStrictEqual(false)
        expect(chess.playerToMove).toStrictEqual(Color.BLACK)
        expect(chess.turnIndexPosition).toStrictEqual([0, 1])
    })
    test ('methods', () => {
        expect(chess.addHeaders).toBeDefined()
        expect(chess.addTimeControl).toBeDefined()
        expect(chess.continue).toBeDefined()
        expect(chess.createContinuationFromSan).toBeDefined()
        expect(chess.createVariationFromSan).toBeDefined()
        expect(chess.end).toBeDefined()
        expect(chess.enterContinuation).toBeDefined()
        expect(chess.enterVariation).toBeDefined()
        expect(chess.getCapturedPieces).toBeDefined()
        expect(chess.getMoves).toBeDefined()
        expect(chess.getMoveHistory).toBeDefined()
        expect(chess.goToStart).toBeDefined()
        expect(chess.loadFen).toBeDefined()
        expect(chess.makeMove).toBeDefined()
        expect(chess.makeMoveFromAlgebraic).toBeDefined()
        expect(chess.moveHistoryToNewContinuation).toBeDefined()
        expect(chess.moveHistoryToNewVariation).toBeDefined()
        expect(chess.nextTurn).toBeDefined()
        expect(chess.pause).toBeDefined()
        expect(chess.pieceAt).toBeDefined()
        expect(chess.placePiece).toBeDefined()
        expect(chess.prevTurn).toBeDefined()
        expect(chess.removePiece).toBeDefined()
        expect(chess.returnFromContinuation).toBeDefined()
        expect(chess.returnFromVariation).toBeDefined()
        expect(chess.selectTurn).toBeDefined()
        expect(chess.setTimeControlFromPgn).toBeDefined()
        expect(chess.setTimerReportFunction).toBeDefined()
        expect(chess.start).toBeDefined()
        expect(chess.toFen).toBeDefined()
        expect(chess.toPgn).toBeDefined()
        expect(chess.toString).toBeDefined()
        expect(chess.updateSetup).toBeDefined()
        expect(chess.validateFen).toBeDefined()
    })
})
