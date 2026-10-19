import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import Chess from '../src/chess.js'
import Fen from '../src/fen.js'
import Game from '../src/game.js'
import { Log } from '../src/log.js'
import Move, { isMoveError } from '../src/move.js'
import ChessTimer from '../src/timers.js'

Log.setPrintThreshold("DISABLE")

const sanFrom = (fen: string | undefined, san: string) => {
    const game = new Game()
    if (fen) {
        game.loadFen(fen)
    }
    const move = Move.generateFromSan(san, game.currentBoard)
    return isMoveError(move) ? null : (move as Move).san
}

describe('SAN parsing', () => {
    test.each(['e', 'N', 'Nf3xyz', 'e4e5', 'O', 'Qd'])('rejects incomplete or invalid SAN "%s"', (san) => {
        expect(sanFrom(undefined, san)).toBeNull()
    })
    test('does not prefix match a different move', () => {
        expect(sanFrom('4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', 'R')).toBeNull()
    })
    test.each([
        [undefined, 'Nf3', 'Nf3'],
        [undefined, 'e4!?', 'e4'],
        ['4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', '0-0', 'O-O'],
        ['4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', '0-0-0', 'O-O-O'],
        ['4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1', 'O-O-O', 'O-O-O'],
        ['4k3/2P5/8/8/8/8/8/4K3 w - - 0 1', 'c8=Q+', 'c8=Q+'],
        ['4k3/2P5/8/8/8/8/8/4K3 w - - 0 1', 'c8Q', 'c8=Q+'],
        ['4k3/2P5/8/8/8/8/8/4K3 w - - 0 1', 'c8=N', 'c8=N'],
        ['6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', 'Ra8', 'Ra8#'],
    ])('accepts valid SAN variants (%s: %s)', (fen, san, expected) => {
        expect(sanFrom(fen, san)).toStrictEqual(expected)
    })
})

describe('PGN import and export', () => {
    const pgnGame = (white: string, moves: string) => `[Event "Test"]\n[White "${white}"]\n[Black "B"]\n[Result "1-0"]\n\n${moves}\n`
    const loadedSans = (pgn: string) => {
        const chess = new Chess()
        chess.loadPgn(pgn)
        const games = [] as string[][]
        for (let i = 0; chess.selectGame(i); i++) {
            games.push(chess.activeGame!.getMoveHistory('san') as string[])
        }
        return games
    }
    test.each([2, 3])('loads all %i games of a multi-game PGN', (count) => {
        const pgn = Array.from({ length: count }, (_v, i) => pgnGame(`W${i}`, '1. e4 e5 2. Nf3 1-0')).join('\n')
        expect(loadedSans(pgn)).toStrictEqual(Array(count).fill(['e4', 'e5', 'Nf3']))
    })
    test.each([
        '{Opening comment} 1. e4 e5 2. Nf3 1-0',
        '; Line comment\n1. e4 e5 2. Nf3 1-0',
        '$1 1. e4 e5 2. Nf3 1-0',
    ])('parses moves after a leading comment or NAG: %j', (moves) => {
        expect(loadedSans(pgnGame('W', moves))).toStrictEqual([['e4', 'e5', 'Nf3']])
    })
    test('does not hang on an unterminated comment', () => {
        expect(loadedSans(pgnGame('W', '1. e4 e5 {never closed 2. Nf3'))).toStrictEqual([['e4', 'e5']])
    })
    test('exports move numbers of a game set up from FEN', () => {
        const game = new Game()
        game.loadFen('4k3/8/8/8/8/8/4P3/4K3 b - - 0 40')
        for (const san of ['Kd7', 'e4', 'Kd6']) {
            game.makeMoveFromSan(san)
        }
        expect(game.toPgn({ showHeaders: false })).toMatch(/^40\.\.\. Kd7 41\. e4 Kd6/)
    })
    test('round-trips NAGs and comments', () => {
        const [game] = (() => {
            const chess = new Chess()
            chess.loadPgn(pgnGame('W', '1. e4 $1 e5 2. Nf3!? {A comment} Nc6 1-0'))
            return [chess.selectGame(0)!]
        })()
        const exported = game.toPgn({ showHeaders: false })
        expect(exported).toContain('e4 $1 e5')
        expect(exported).toContain('Nf3 $5 {A comment} Nc6')
    })
})

describe('Game end', () => {
    const board = (fen: string) => {
        const game = new Game()
        game.loadFen(fen)
        return game.currentBoard
    }
    test('checkmate sets the result of an untimed game', () => {
        const game = new Game()
        for (const san of ['f3', 'e5', 'g4', 'Qh4#']) {
            game.makeMoveFromSan(san)
        }
        expect(game.headers.get('Result')).toStrictEqual('0-1')
        expect(game.toPgn({ showHeaders: false })).toStrictEqual('1. f3 e5 2. g4 Qh4# 0-1')
    })
    test('unfinished game is exported with an unknown result', () => {
        const game = new Game()
        game.makeMoveFromSan('e4')
        expect(game.toPgn({ showHeaders: false })).toStrictEqual('1. e4 *')
    })
    test('untimed game can be started', () => {
        expect(new Game().start()).toStrictEqual(true)
    })
    test.each([
        ['B3k3/b7/8/8/8/8/8/4K3 w - - 0 1', false], // Bishops on opposite colors
        ['B3k3/1b6/8/8/8/8/8/4K3 w - - 0 1', true], // Both on light squares
        ['5bk1/8/8/8/8/8/8/2B1K3 w - - 0 1', true], // Both on dark squares
        ['4k3/8/8/8/8/8/8/2B1KB2 w - - 0 1', false], // Bishop pair
        ['4k3/8/8/8/8/8/8/4KN2 w - - 0 1', true],
        ['4k3/8/8/8/8/8/8/4KR2 w - - 0 1', false],
    ])('insufficient material in %s is %s', (fen, expected) => {
        expect(board(fen).hasInsufficientMaterial).toStrictEqual(expected)
    })
    test('insufficient material ends the game in a draw', () => {
        expect(board('4k3/8/8/8/8/8/8/4K3 w - - 0 1').endState.header).toStrictEqual('1/2-1/2')
    })
})

describe('Board state', () => {
    const board = (fen: string) => {
        const game = new Game()
        game.loadFen(fen)
        return game.currentBoard
    }
    test('generating moves for one square does not affect the full move list', () => {
        const b = new Game().currentBoard
        expect(b.generateMoves({ onlyForSquare: 'e2' }).length).toStrictEqual(2)
        expect(b.generateMoves().filter(m => m.legal).length).toStrictEqual(20)
        // And the other way around, with the full list cached
        expect(b.generateMoves({ onlyForSquare: 'g1' }).length).toStrictEqual(2)
        expect(b.generateMoves({ onlyForSquare: 116 }).length).toStrictEqual(0) // Index of e1
    })
    test('castling rights without king or rook in place are dropped', () => {
        const b = board('4k3/8/8/8/8/8/8/4K3 w K - 0 1')
        expect(b.toFen()).toStrictEqual('4k3/8/8/8/8/8/8/4K3 w - - 0 1')
        expect(b.generateMoves().map(m => m.uci)).not.toContain('e1g1')
    })
    test('validation allows only the player in turn to be in check', () => {
        expect(board('4k3/4R3/8/8/8/8/8/4K3 b - - 0 1').validate(false, false).isValid).toStrictEqual(true)
        expect(new Game().loadFen('4k3/4R3/8/8/8/8/8/4K3 w - - 0 1')).toStrictEqual(false)
    })
    test('repetition takes the player in turn into account', () => {
        // White king triangulates (e1-d1-d2-e1) against a two-square shuffle: the placement with Ke1 and Kh8 occurs
        // three times, but only twice with white to move
        const b = board('7k/8/8/8/8/8/8/R3K3 w - - 0 1')
        for (const san of ['Kd1', 'Kg8', 'Kd2', 'Kh8', 'Ke1', 'Kg8', 'Kd1', 'Kh8', 'Kd2', 'Kg8', 'Ke1', 'Kh8']) {
            b.makeMoveFromSAN(san, { isPlayerMove: false })
        }
        expect(b.hasRepeatedThreefold).toStrictEqual(false)
    })
    test('repetition takes castling rights into account', () => {
        // The first occurrence still has castling rights, so the position only repeats twice afterwards
        const b = board('r3k3/8/8/8/8/8/8/4K3 b q - 0 1')
        for (const san of ['Kd8', 'Kd2', 'Ke8', 'Ke1', 'Kd8', 'Kd2', 'Ke8', 'Ke1']) {
            b.makeMoveFromSAN(san, { isPlayerMove: false })
        }
        expect(b.hasRepeatedThreefold).toStrictEqual(false)
    })
    test('en passant square only matters when a capture is possible', () => {
        expect(board('4k3/8/8/8/4P3/8/8/4K3 b - e3 0 1').positionKey).toStrictEqual('4k3/8/8/8/4P3/8/8/4K3 b - -')
        expect(board('4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1').positionKey).toStrictEqual('4k3/8/8/8/3pP3/8/8/4K3 b - e3')
    })
})

describe('Variations', () => {
    test('UCI notation includes the promotion piece', () => {
        const game = new Game()
        game.loadFen('4k3/2P5/8/8/8/8/8/4K3 w - - 0 1')
        expect((Move.generateFromSan('c8=N', game.currentBoard) as Move).uci).toStrictEqual('c7c8n')
        expect((Move.generateFromSan('Kd2', game.currentBoard) as Move).uci).toStrictEqual('e1d2')
    })
    test('promotions to different pieces are different moves', () => {
        const game = new Game()
        game.loadFen('8/4P1k1/8/8/8/8/8/4K3 w - - 0 1')
        game.makeMoveFromSan('e8=Q')
        game.prevTurn()
        const knightPromotion = Move.generateFromSan('e8=N', game.currentBoard) as Move
        expect(game.currentBoard.isNewMove(knightPromotion).isNew).toStrictEqual(true)
        const turn = game.makeMove(knightPromotion)
        expect(isMoveError(turn) ? null : turn.move.san).toStrictEqual('e8=N+')
    })
    test('branching a variation returns the new turn', () => {
        const game = new Game()
        for (const san of ['e4', 'e5', 'Nf3']) {
            game.makeMoveFromSan(san)
        }
        game.selectTurn(0)
        const turn = game.makeMoveFromSan('c5')
        expect(isMoveError(turn) ? null : turn.move.san).toStrictEqual('c5')
        expect(game.currentBoard.id).not.toStrictEqual(0)
    })
})

describe('Timers', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.useRealTimers()
    })
    test('stage fields apply until the end of their last turn', () => {
        const timer = new ChessTimer()
        timer.addField({ start: 1, end: 40, limit: 7200, delay: 0, increment: 10, hourglass: false })
        timer.addField({ start: 41, end: null, limit: 1800, delay: 0, increment: 30, hourglass: false })
        // Plies 0-79 belong to turns 1-40
        expect([0, 77, 78, 79, 80, 81].map(ply => timer.getIncrement(ply))).toStrictEqual([10, 10, 10, 10, 30, 30])
    })
    test('universal delay and increment both apply', () => {
        const timer = new ChessTimer('300 d5 +3')
        expect(timer.getDelay(0)).toStrictEqual(5)
        expect(timer.getIncrement(0)).toStrictEqual(3)
    })
    test.each([
        ['60+0', [60]],
        ['180+2', [180]],
        ['5', [5]],
        ['40/9000:300', [9000, 300]],
    ])('PGN TimeControl %s is in seconds', (tc, limits) => {
        const game = new Game()
        game.setTimeControlFromPgn(tc)
        expect(game.timers.fields.filter(f => f.limit).map(f => f.limit)).toStrictEqual(limits)
    })
    test('descriptor with a single sudden death limit round-trips', () => {
        const descriptor = new ChessTimer('300+3').toString()
        expect(descriptor).toStrictEqual('300:+3')
        const reparsed = new ChessTimer(descriptor)
        expect(reparsed.fields).toStrictEqual(new ChessTimer('300+3').fields)
    })
    test('player who runs out of time during their move is flagged', () => {
        const timer = new ChessTimer()
        timer.parseTimeControlString('60+0', true)
        timer.moveMade(0) // White's first move starts the clock
        vi.advanceTimersByTime(61_000)
        expect(timer.moveMade(1)).toHaveProperty('error')
        expect(timer.flagged).toStrictEqual('b')
    })
    test('running clock flags the player and ends the game', () => {
        const game = new Game()
        game.setTimeControlFromPgn('60+0')
        game.timers.setAutoTimeout(true)
        game.setTimerReportFunction(() => {})
        expect(game.start()).toStrictEqual(true)
        game.makeMoveFromSan('e4')
        vi.advanceTimersByTime(61_000)
        expect(game.timers.flagged).toStrictEqual('b')
        expect(game.headers.get('Result')).toStrictEqual('1-0')
        // Moves after the game has ended do not change the result
        game.makeMoveFromSan('e5')
        expect(game.headers.get('Result')).toStrictEqual('1-0')
    })
    test('without automatic timeout, moves are refused until the game is ended', () => {
        const game = new Game()
        game.setTimeControlFromPgn('60+0')
        game.setTimerReportFunction(() => {})
        game.start()
        game.makeMoveFromSan('e4')
        vi.advanceTimersByTime(61_000)
        expect(game.timers.flagged).toStrictEqual('b')
        expect(game.hasEnded).toStrictEqual(false)
        expect(isMoveError(game.makeMoveFromSan('e5'))).toStrictEqual(true)
        game.end('1-0')
        expect(isMoveError(game.makeMoveFromSan('e5'))).toStrictEqual(false)
    })
    test('time of the next stage is added when a player completes the last move of a stage', () => {
        const timer = new ChessTimer()
        timer.parseTimeControlString('2/10:10', true)
        const move = (ply: number, seconds: number) => {
            vi.advanceTimersByTime(seconds*1000)
            return timer.moveMade(ply)
        }
        move(0, 0)
        move(1, 1)
        // White completes move 2, the last move of the first stage: 10 - 1 + 10
        move(2, 1)
        expect(timer.time.remaining.w).toStrictEqual(19_000)
        expect(timer.time.remaining.b).toStrictEqual(9_000)
        move(3, 1)
        expect(timer.time.remaining.b).toStrictEqual(18_000)
        // White uses more time than was left of the first stage, but not of the second
        expect(move(4, 12)).not.toHaveProperty('error')
        expect(timer.flagged).toStrictEqual(null)
        expect(timer.time.remaining.w).toStrictEqual(7_000)
    })
    test('an hourglass clock flags a player who runs out of time', () => {
        const timer = new ChessTimer()
        timer.parseTimeControlString('*60', true)
        timer.moveMade(0)
        vi.advanceTimersByTime(61_000)
        expect(timer.moveMade(1)).toHaveProperty('error')
        expect(timer.flagged).toStrictEqual('b')
    })
    test('timeout against a bare king is a draw', () => {
        const game = new Game()
        game.loadFen('4k3/8/8/8/8/8/8/R3K3 b - - 0 1')
        game.timers.setAutoTimeout(true)
        game.handleTimeout('w')
        expect(game.headers.get('Result')).toStrictEqual('1/2-1/2')
    })
})

describe('Move metadata and lenient PGN', () => {
    test('move numbers that do not match the game are skipped', () => {
        const chess = new Chess()
        chess.loadPgn('[Event "Test"]\n\n5. e4 e5 6. Nf3 *\n')
        expect(chess.selectGame(0)?.getMoveHistory('san')).toStrictEqual(['e4', 'e5', 'Nf3'])
    })
    test('move times are recorded relative to the previous move', () => {
        const board = new Game().currentBoard
        board.makeMoveFromSAN('e4', { moveTime: 1000 })
        board.makeMoveFromSAN('e5', { moveTime: 4500 })
        expect(board.history.map(turn => [turn.meta.moveTime, turn.meta.moveTimeDelta])).toStrictEqual([[1000, 0], [4500, 3500]])
    })
})

describe('Branching from history', () => {
    // Position P (after 1. e4 e5) occurs three times in the main line
    const MAIN = ['e4', 'e5', 'Nf3', 'Nf6', 'Ng1', 'Ng8', 'Nf3', 'Nf6', 'Ng1', 'Ng8']
    // Returns to P after four plies
    const SHUFFLE = ['Nc3', 'Nc6', 'Nb1', 'Nb8']
    const mainLine = () => {
        const game = new Game()
        for (const san of MAIN) {
            game.makeMoveFromSan(san)
        }
        return game
    }
    const countAtCurrent = (game: Game) => game.currentBoard.posCount.get(game.currentBoard.positionKey)
    test('browsing history shows counts for the displayed position', () => {
        const game = mainLine()
        game.selectTurn(1)
        expect(countAtCurrent(game)).toStrictEqual(1)
        expect(game.currentBoard.hasRepeatedThreefold).toStrictEqual(false)
        game.selectTurn(MAIN.length - 1)
        expect(countAtCurrent(game)).toStrictEqual(3)
    })
    test.each([
        ['a continuation', (game: Game) => {
            game.selectTurn(1)
            game.createContinuationFromSan(SHUFFLE[0])
        }],
        ['a variation', (game: Game) => {
            game.selectTurn(2)
            game.createVariationFromSan(SHUFFLE[0])
        }],
        ['a player move', (game: Game) => {
            game.selectTurn(1)
            game.makeMoveFromSan(SHUFFLE[0])
        }],
        ['a player move replacing history', (game: Game) => {
            game.selectTurn(1)
            game.makeMoveFromSan(SHUFFLE[0], { branchVariation: false })
        }],
    ])('%s does not inherit counts from later in the line', (_label, branch) => {
        const game = mainLine()
        branch(game)
        for (const san of SHUFFLE.slice(1)) {
            game.makeMoveFromSan(san)
        }
        // P occurred once before branching and once in the new line
        expect(countAtCurrent(game)).toStrictEqual(2)
        expect(game.currentBoard.hasRepeatedThreefold).toStrictEqual(false)
    })
    test('repetitions before the branch point are counted', () => {
        const game = mainLine()
        game.selectTurn(5) // P has occurred twice
        game.createContinuationFromSan(SHUFFLE[0])
        for (const san of SHUFFLE.slice(1)) {
            game.makeMoveFromSan(san)
        }
        expect(countAtCurrent(game)).toStrictEqual(3)
        expect(game.currentBoard.hasRepeatedThreefold).toStrictEqual(true)
    })
    test('variation created before a later castling move keeps the rook', () => {
        const game = new Game()
        for (const san of ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O', 'Nf6']) {
            game.makeMoveFromSan(san)
        }
        game.selectTurn(5) // Variation for 3... Bc5
        expect(game.createVariationFromSan('Be7')).toStrictEqual(true)
        expect(game.currentBoard.toFen()).toStrictEqual('r1bqk1nr/ppppbppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4')
    })
})

describe('Review fixes', () => {
    const moves = (pgn: string) => {
        const chess = new Chess()
        chess.loadPgn(`[Event "Test"]\n\n${pgn}\n`)
        return chess.selectGame(0)!
    }
    test('move numbers without periods are skipped', () => {
        expect(moves('1 e4 e5 2 Nf3 *').getMoveHistory('san')).toStrictEqual(['e4', 'e5', 'Nf3'])
        expect(moves('1 . e4 e5 2 . Nf3 *').getMoveHistory('san')).toStrictEqual(['e4', 'e5', 'Nf3'])
    })
    test('castling written with zeros does not end the game', () => {
        // Black's move has no move number in front of it
        const game = moves('1. e4 e5 2. Nf3 Nf6 3. Bc4 Bc5 4. 0-0 0-0 5. d3 *')
        expect(game.getMoveHistory('san')).toStrictEqual(['e4', 'e5', 'Nf3', 'Nf6', 'Bc4', 'Bc5', 'O-O', 'O-O', 'd3'])
    })
    test('evaluation glyphs are read as NAGs and do not end the game', () => {
        const game = moves('1. e4 e5 2. Nf3 +/- Nc6 = 3. Bb5 -+ *')
        expect(game.getMoveHistory('san')).toStrictEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'])
        expect(game.toPgn()).toContain('2. Nf3 $16 Nc6 $10 3. Bb5 $19')
    })
    test('a comment after a variation belongs to the move before the variation', () => {
        const game = moves('1. e4 (1. d4 {alt}) {after var} e5 *')
        expect(game.toPgn()).toContain('1. e4 {after var} (1. d4 {alt}) 1... e5 *')
    })
    test('a result in the move text is kept when there is no Result header', () => {
        expect(moves('1. e4 e5 1-0').toPgn()).toMatch(/1\. e4 e5 1-0$/)
    })
    test('the recorded result is kept when the moves end the game differently', () => {
        // The game ends in checkmate, but the record says otherwise
        const chess = new Chess()
        chess.loadPgn('[Event "Test"]\n[Result "1/2-1/2"]\n\n1. f3 e5 2. g4 Qh4# 1/2-1/2\n')
        expect(chess.selectGame(0)!.headers.get('Result')).toStrictEqual('1/2-1/2')
    })
    test('loading a FEN starts a new game', () => {
        const game = new Game()
        for (const san of ['f3', 'e5', 'g4', 'Qh4#']) {
            game.makeMoveFromSan(san)
        }
        expect(game.headers.get('Result')).toStrictEqual('0-1')
        game.loadFen(Fen.DEFAULT_STARTING_STATE)
        expect(game.hasEnded).toStrictEqual(false)
        for (const san of ['e4', 'f6', 'd4', 'g5', 'Qh5#']) {
            game.makeMoveFromSan(san)
        }
        expect(game.headers.get('Result')).toStrictEqual('1-0')
    })
    test('undoing moves while browsing history keeps the board consistent', () => {
        const game = new Game()
        for (const san of ['e4', 'e5', 'Nf3']) {
            game.makeMoveFromSan(san)
        }
        const board = game.currentBoard
        board.selectTurn(0)
        board.undoMoves()
        expect(board.toFen()).toStrictEqual('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')
        expect(board.history.length).toStrictEqual(2)
    })
    test('creating a variation without a selected turn fails without throwing', () => {
        const game = new Game()
        game.makeMoveFromSan('e4')
        game.currentBoard.selectTurn(-1)
        expect(game.createVariationFromSan('d4')).toStrictEqual(false)
        expect(game.createContinuationFromSan('d4')).toStrictEqual(false)
    })
})

describe('FEN validation and loading', () => {
    test.each([
        ['P3k3/8/8/8/8/8/8/4K3 w - - 0 1', 17], // Pawn on the 8th rank
        ['4k3/8/8/8/8/8/8/4K2p b - - 0 1', 17], // Pawn on the 1st rank
        ['4k3/8/8/8/8/8/8/4K3 w - - 0 1x', 6],
        ['4k3/8/8/8/8/8/8/4K3 w - - 1.5 1', 7],
        ['4k3/8/8/8/8/8/8/4K3 w - - -0 1', 7],
        ['4k3/pppppppp0/8/8/8/8/8/4K3 w - - 0 1', 4], // Zero is not a valid empty square count
        ['4k3/8/8/8/8/8/8/4K3 b - e3 0 1', 18], // No pawn has advanced two squares
        ['4k3/8/8/3pP3/8/8/8/4K3 w - e6 0 1', 18], // The pawn in front of e6 is white
        ['4k3/8/8/8/8/8/8/R3K2R w KK - 0 1', 9], // Duplicate castling right
    ])('rejects %s', (fen, errorCode) => {
        expect(Fen.Validate(fen).errorCode).toStrictEqual(errorCode)
    })
    test.each([
        '4k3/8/8/8/3pP3/8/8/4K3 b - e3 0 1',
        '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1',
        '4k3/8/8/8/8/8/8/R3K2R w QK - 0 1', // Unusual castling order
    ])('accepts %s', (fen) => {
        expect(Fen.Validate(fen).errorCode).toStrictEqual(0)
    })
    test.each([
        ['kK6/8/8/8/8/8/8/8 w - - 0 1'], // Adjacent kings
        ['4k3/4Q3/8/8/8/8/8/4K3 w - - 0 1'], // Black in check with white to move
    ])('refuses to load an impossible position %s', (fen) => {
        expect(new Game().loadFen(fen)).toStrictEqual(false)
    })
    test('loads a FEN with surrounding white space', () => {
        const game = new Game()
        expect(game.loadFen('  4k3/8/8/8/8/8/8/4K3 w - - 0 1 ')).toStrictEqual(true)
        expect(game.currentBoard.toFen()).toStrictEqual('4k3/8/8/8/8/8/8/4K3 w - - 0 1')
    })
    test('invalid FEN leaves the game unchanged', () => {
        const game = new Game()
        game.makeMoveFromSan('e4')
        const fen = game.currentBoard.toFen()
        expect(game.loadFen('not a fen')).toStrictEqual(false)
        expect(game.currentBoard.toFen()).toStrictEqual(fen)
        expect(game.variations.length).toStrictEqual(1)
    })
    test('game from an invalid FEN starts from the initial position', () => {
        const game = new Game('kK6/8/8/8/8/8/8/8 w - - 0 1')
        expect(game.currentBoard.toFen()).toStrictEqual(Fen.DEFAULT_STARTING_STATE)
        expect(game.headers.get('FEN')).toBeUndefined()
    })
    test('loaded position is the main line, so the game can end', () => {
        const game = new Game()
        game.loadFen('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1')
        expect(game.currentBoard.id).toStrictEqual(0)
        game.makeMoveFromSan('Ra8#')
        expect(game.headers.get('Result')).toStrictEqual('1-0')
    })
})
