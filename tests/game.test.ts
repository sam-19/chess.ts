/**
 * @jest-environment jsdom
 */

import { Fen, Game } from '../src'
import { Log } from 'scoped-event-log'
import { ChessTurn } from '../src/types'

Log.setPrintThreshold("WARN")

const finalPGN = `[White "Ms. Blanco"]
[WhiteElo "2200"]
[Black "Mr. Black"]
[BlackElo "1600"]
[Event "Test match"]
[Date "2001.02.03"]
[WhiteTitle "IM"]
[Round "1"]

1. e4 e5 2. Nc3 Bb4 3. Qh5 Nf6 4. Bc4 Nxe4 5. Qxf7#`
const finalString = `  +------------------------+  Mr. Black
8 | r  n  b  q  k  .  .  r |  Move 5, game over
7 | p  p  p  p  .  Q  p  p |  1. e4 e5 2. Nc3 Bb4 3. Qh5 Nf6 4. Bc4 Nxe4 5. Qxf7#
6 | .  .  .  .  .  .  .  . |
5 | .  .  .  .  p  .  .  . |  Result:  rnbqk2r/pppp1Qpp/8/4p3/1bB1n3/2N5/PPPP1PPP/R1B1K1NR b KQkq - 0 5
4 | .  b  B  .  n  .  .  . |  1-0
3 | .  .  N  .  .  .  .  . |
2 | P  P  P  P  .  P  P  P |
1 | R  .  B  .  K  .  N  R |
  +------------------------+  Ms. Blanco
    a  b  c  d  e  f  g  h`

describe('Game class', () => {
    test('Create a Game with default parameters', () => {
        expect(new Game()).toBeDefined()
    })
})
const game = new Game()
describe('Game creation with parameters', () => {
    test('Create a Game from FEN string', () => {
        expect(new Game(Fen.DEFAULT_STARTING_STATE)).toBeDefined()
    })
    test('Create a Game with headers', () => {
        const headerGame = new Game(Fen.DEFAULT_STARTING_STATE, [
            ['Event', "F/S Return Match"],
            ['Site', "Belgrade, Serbia JUG"],
            ['Date', "1992.11.04"],
            ['Round', "29"],
            ['White', "Fischer, Robert J."],
            ['Black', "Spassky, Boris V."],
            ['Result', "1/2-1/2"],
        ])
        expect(headerGame.event).toStrictEqual('F/S Return Match')
        expect(headerGame.site).toStrictEqual('Belgrade, Serbia JUG')
        expect(headerGame.date).toStrictEqual('1992.11.04')
        expect(headerGame.round).toStrictEqual(29)
        expect(headerGame.players.w.name).toStrictEqual('Fischer, Robert J.')
        expect(headerGame.players.b.name).toStrictEqual('Spassky, Boris V.')
        expect(headerGame.result).toStrictEqual('1/2-1/2')

    })
})

describe('Game navigation', () => {
    test('Making moves', () => {
        game.makeMoveFromSan('e4')
        game.makeMoveFromSan('e5')
        game.makeMoveFromSan('Nc3')
        game.makeMoveFromSan('Bb4')
        const history = game.getMoveHistory()
        expect(history.length).toStrictEqual(4)
        expect((history[3] as ChessTurn).toString()).toStrictEqual('f8-b4')
        expect((history[3] as ChessTurn).move.san).toStrictEqual('Bb4')
        expect((history[3] as ChessTurn).plyNum).toStrictEqual(3)
        expect(game.getMoveHistory('san')).toStrictEqual(['e4', 'e5', 'Nc3', 'Bb4'])
    })
    test('Navigating turns', () => {
        game.selectTurn(2)
        expect(game.getMoveHistory('san')).toStrictEqual(['e4', 'e5', 'Nc3'])
        game.prevTurn()
        expect(game.getMoveHistory('san')).toStrictEqual(['e4', 'e5'])
        game.nextTurn()
        game.nextTurn()
        expect(game.getMoveHistory('san')).toStrictEqual(['e4', 'e5', 'Nc3', 'Bb4'])
        game.goToStart()
        expect(game.getMoveHistory().length).toStrictEqual(0)
    })
})
describe('Manipulating headers', () => {
    test('Add headers', () => {
        game.addHeaders([
            ['White', 'Mr. White'],
            ['WhiteElo', '1500'],
            ['Black', 'Mr. Black'],
            ['BlackElo', '1600'],
            ['Event', 'Test match'],
            ['Date', '2000.01.01'],
        ])
        expect(game.headers.length()).toStrictEqual(6)
    })
    test('Alter headers', () => {
        expect(game.headers.get('date')).toStrictEqual('2000.01.01')
        game.addHeaders([['date', '2001.02.03']])
        expect(game.headers.get('date')).toStrictEqual('2001.02.03')
    })
})
describe('Accessing header information', () => {
    test('getters for header properties', () => {
        expect(game.date).toStrictEqual('2001.02.03')
        expect(game.event).toStrictEqual('Test match')
        expect(game.players.b.elo).toStrictEqual(1600)
        expect(game.players.b.name).toStrictEqual('Mr. Black')
        expect(game.players.w.elo).toStrictEqual(1500)
        expect(game.players.w.name).toStrictEqual('Mr. White')
    })
    test('Altering header properties', () => {
        game.players.w.name = 'Ms. Blanco'
        game.players.w.title = 'IM'
        game.players.w.elo = 2200
        game.round = 1
        expect(game.headers.get('white')).toStrictEqual('Ms. Blanco')
        expect(game.headers.get('whitetitle')).toStrictEqual('IM')
        expect(game.headers.get('round')).toStrictEqual('1')
    })
})
describe('Exporting game state', () => {
    test('Export game as PGN', () => {
        game.selectTurn(3)
        game.makeMoveFromSan('Qh5')
        game.makeMoveFromSan('Nf6')
        game.makeMoveFromSan('Bc4')
        game.makeMoveFromSan('Nxe4')
        game.makeMoveFromSan('Qxf7#')
        expect(game.toPgn()).toStrictEqual(finalPGN)
    })
    test('Export game as ASCII string', () => {
        expect(game.toString()).toStrictEqual(finalString)
    })
})
describe('Variation creation', () => {
    const varGame = new Game('rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2')
    // Test variation creation
    test('create new branch variation', () => {
        expect(varGame.variations.length).toStrictEqual(1)
        varGame.makeMoveFromSan('Qa5')
        varGame.makeMoveFromSan('Bb5')
        varGame.makeMoveFromSan('Qxd2')
        varGame.prevTurn()
        let moves = varGame.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('Qxb5')
        varGame.makeMoveFromSan('Qxb5')
        // New variation board id should be 1
        expect(varGame.currentBoard.id).toStrictEqual(1)
        const selTurn = varGame.currentBoard.parentBoard?.selectedTurnIndex
        const branchTurn = varGame.currentBoard.parentBranchTurnIndex
        expect(selTurn).toStrictEqual(branchTurn)
        expect(varGame.currentBoard.parentBoard?.selectedTurn.variations.length).toStrictEqual(1)
        expect(varGame.currentBoard.continuation).toBeFalsy()
        moves = varGame.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('Qe2')
        varGame.makeMoveFromSan('Qe2')
        moves = varGame.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('c4')
        varGame.makeMoveFromSan('c4')
        moves = varGame.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('Qxc4')
        varGame.makeMoveFromSan('Qxc4')
        moves = varGame.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('Qa6')
        varGame.makeMoveFromSan('Qa6')
        moves = varGame.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('Qxc8#')
        varGame.makeMoveFromSan('Qxc8#')
        moves = varGame.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.length).toStrictEqual(0)
        expect(varGame.isFinished).toBeTruthy()
    })
})
describe('Continuation creation', () => {
    const contGame = new Game('rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2')
    // Test continuation creation
    test('create new branch continuation', () => {
        expect(contGame.variations.length).toStrictEqual(1)
        contGame.makeMoveFromSan('Qa5')
        contGame.makeMoveFromSan('Bb5')
        contGame.makeMoveFromSan('Qxb5')
        contGame.makeMoveFromSan('Qe2')
        contGame.makeMoveFromSan('c4')
        contGame.makeMoveFromSan('Qxc4')
        contGame.makeMoveFromSan('Qa6')
        contGame.makeMoveFromSan('Qxc8#')
        contGame.prevTurn()
        contGame.prevTurn()
        contGame.prevTurn()
        const initialBoard = contGame.currentBoard
        const prevTurn = contGame.currentBoard.selectedTurnIndex
        contGame.createContinuationFromSan('b4')
        const branchTurn = contGame.currentBoard.parentBranchTurnIndex
        expect(prevTurn).toStrictEqual(branchTurn)
        expect(initialBoard.history[prevTurn].variations.length).toStrictEqual(1)
        expect(contGame.currentBoard.parentBoard?.selectedTurn.variations.length).toStrictEqual(1)
        expect(contGame.currentBoard.continuation).toBeTruthy()
        expect(contGame.variations.length).toStrictEqual(2)
        expect(contGame.currentBoard.id).toStrictEqual(1)
        let moves = contGame.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('e5')
        contGame.makeMoveFromSan('e5')
        moves = contGame.getMoves({ notation: 'san', filter: 'legal' })
        expect(moves.legal.map(move => move.san)).toContain('O-O')
        contGame.makeMoveFromSan('O-O')
        expect(contGame.getMoveHistory('san')).toStrictEqual(['Qa5', 'Bb5', 'Qxb5', 'Qe2', 'c4', 'b4', 'e5', 'O-O'])
    })
})
