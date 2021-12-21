// @ts-ignore: this name mapping is defined in jest config
import Chess from '@/chess'

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
Chess.Log.setLevel(2)
describe('Chess class', () => {
    test('create Chess object with default parameters', () => {
        expect(chess).toBeDefined()
    })
})
describe('Loading games from PGN', () => {
    /* Test PGN parser */
    test('parse single PGN', () => {
        const parsed = chess.parseFullPgn(testPGN)
        expect(parsed.length).toStrictEqual(1)
        expect(parsed[0].headers).toBeDefined()
        expect(parsed[0].moves).toBeDefined()
        expect(parsed[0].headers.length).toStrictEqual(7)
        expect(parsed[0].moves.length).toStrictEqual(558)
        const game = chess.createGameFromPgn(parsed[0])
        expect(game).toBeTruthy()
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
        expect(active.result[Chess.Color.WHITE]).toStrictEqual(Chess.Game.RESULT.DRAW)
        expect(active.result[Chess.Color.BLACK]).toStrictEqual(Chess.Game.RESULT.DRAW)
    })
    test('loaded game navigation', () => {
        const active = chess.activeGame
        expect(active).toBeTruthy()
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
        active.selectTurn(84)
        expect(active.toFen()).toStrictEqual('8/8/4R1p1/2k3p1/1p4P1/1P1b1P2/3K1n2/8 b - - 2 43')
        expect(active.currentBoard.toString()).toStrictEqual(boardAtEnd)
    })
    test('export PGN file', () => {
        const active = chess.activeGame
        expect(active).toBeTruthy()
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
})
describe('Game creation', () => {
    // Test FEN loader
    const { group, index } = chess.newGame('rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', 'game')
    const active = chess.games[group][index]
    test('create a new game from FEN', () => {
        expect(active).toBeTruthy()
    })
    test('make move in game', () => {
        expect(active).toBeTruthy()
        expect(group).toStrictEqual('game')
        expect(index).toStrictEqual(0)
        let moves = active.getMoves({ notation: 'san' })
        expect(moves.blocked.length).toStrictEqual(69)
        expect(moves.illegal.length).toStrictEqual(0)
        expect(moves.legal.length).toStrictEqual(22)
        const legalMoves = moves.legal.map((move: any) => move.san)
        expect(legalMoves).toContain('Qa5')
        active.makeMoveFromSan('Qa5')
        moves = active.getMoves({ notation: 'san' })
        expect(moves.illegal.map((move: any) => move.san)).toContain('d3')
        expect(moves.legal.map((move: any) => move.san)).toContain('Bb5')
        active.makeMoveFromSan('Bb5')
        moves = active.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map((move: any) => move.san)).toContain('Qxd2+')
        active.makeMoveFromSan('Qxd2')
    })
})
describe('Variation creation', () => {
    const { group, index } = chess.newGame('rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', 'variation')
    const active = chess.games[group][index]
    // Test variation creation
    test('create new branch variation', () => {
        expect(active).toBeTruthy()
        expect(group).toStrictEqual('variation')
        expect(index).toStrictEqual(0)
        expect(active.variations.length).toStrictEqual(1)
        active.makeMoveFromSan('Qa5')
        active.makeMoveFromSan('Bb5')
        active.makeMoveFromSan('Qxd2')
        active.prevTurn()
        let moves = active.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map((move: any) => move.san)).toContain('Qxb5')
        active.makeMoveFromSan('Qxb5')
        // New variation board id should be 1
        expect(active.currentBoard.id).toStrictEqual(1)
        const selTurn = active.currentBoard.parentBoard.selectedTurnIndex
        const branchTurn = active.currentBoard.parentBranchTurnIndex
        expect(selTurn).toStrictEqual(branchTurn)
        expect(active.currentBoard.parentBoard.selectedTurn.variations.length).toStrictEqual(1)
        expect(active.currentBoard.continuation).toBeFalsy()
        moves = active.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map((move: any) => move.san)).toContain('Qe2')
        active.makeMoveFromSan('Qe2')
        moves = active.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map((move: any) => move.san)).toContain('c4')
        active.makeMoveFromSan('c4')
        moves = active.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map((move: any) => move.san)).toContain('Qxc4')
        active.makeMoveFromSan('Qxc4')
        moves = active.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map((move: any) => move.san)).toContain('Qa6')
        active.makeMoveFromSan('Qa6')
        moves = active.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map((move: any) => move.san)).toContain('Qxc8#')
        active.makeMoveFromSan('Qxc8#')
        moves = active.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.length).toStrictEqual(0)
        expect(active.isFinished).toBeTruthy()
    })
})
    
describe('Continuation creation', () => {
    const { group, index } = chess.newGame('rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', 'continuation')
    const active = chess.games[group][index]
    // Test continuation creation
    test('create new branch continuation', () => {
        expect(active).toBeTruthy()
        expect(group).toStrictEqual('continuation')
        expect(index).toStrictEqual(0)
        expect(active.variations.length).toStrictEqual(1)
        active.makeMoveFromSan('Qa5')
        active.makeMoveFromSan('Bb5')
        active.makeMoveFromSan('Qxb5')
        active.makeMoveFromSan('Qe2')
        active.makeMoveFromSan('c4')
        active.makeMoveFromSan('Qxc4')
        active.makeMoveFromSan('Qa6')
        active.makeMoveFromSan('Qxc8#')
        active.prevTurn()
        active.prevTurn()
        active.prevTurn()
        const initialBoard = active.currentBoard
        const prevTurn = active.currentBoard.selectedTurnIndex
        active.createContinuationFromSan('b4')
        const branchTurn = active.currentBoard.parentBranchTurnIndex
        expect(prevTurn).toStrictEqual(branchTurn)
        expect(initialBoard.history[prevTurn].variations.length).toStrictEqual(1)
        expect(active.currentBoard.parentBoard.selectedTurn.variations.length).toStrictEqual(1)
        expect(active.currentBoard.continuation).toBeTruthy()
        expect(active.variations.length).toStrictEqual(2)
        expect(active.currentBoard.id).toStrictEqual(1)
        let moves = active.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map((move: any) => move.san)).toContain('e5')
        active.makeMoveFromSan('e5')
        moves = active.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map((move: any) => move.san)).toContain('O-O')
        active.makeMoveFromSan('O-O')
        expect(active.getMoveHistory('san')).toStrictEqual(['Qa5', 'Bb5', 'Qxb5', 'Qe2', 'c4', 'b4', 'e5', 'O-O'])
    })
})
