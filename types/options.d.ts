import Options from "../src/options"
import Piece from "../src/piece"

interface ChessOptions {
    assign: (options: any) => void
}

declare namespace MethodOptions {
    namespace Board {
        type createFromParent = {
            continuation?: boolean
        }
        type generateMoves = {
            onlyForSquare?: string
            includeSan?: boolean
            includeFen?: boolean
            onlyLegal?: boolean
        }
        type getMoves = {
            notation?: 'all' | 'algebraic' | 'san' | 'uci'
            onlyDestinations?: boolean
            includeFen?: boolean
            onlyForSquare?: string
            filter?: 'legal' | 'illegal' | 'blocked'
        }
        type makeMove = {
            comment?: string | null
            isPlayerMove?: boolean
            moveTime?: number
            moveTimeDelta?: number
            preserveGame?: boolean
            puzzleSolution?: boolean
            takeback?: boolean
            updatePosCount?: boolean
        }
        type toFen = { meta?: boolean }
        type undoMoves = {
            move?: number
            updatePosCount: boolean
        }
    }
    namespace Chess {
        type loadPgn = {
            activateFirst?: boolean,
            maxItems?: number,
            resetGames?: boolean,
            returnHeaders?: ((headers: string[][][]) => void) | null,
        }
        type loadPgnInBatches = {
            batchSize?: number
            maxAmount?: number
            reportProgress?: ((progress: number[]) => void) | null
            startFrom?: number
        }
    }
    namespace Game {
        type makeMove = {
            branchVariation?: boolean
            comment?: string | null
            isPlayerMove?: boolean
            moveTime?: number
            moveTimeDelta?: number
            preserveGame?: boolean
            puzzleSolution?: boolean
            takeback?: boolean
            updatePosCount?: boolean
        }
        type toPgn = {
            lengthMeasure?: 'width' | 'moves'
            maxLength?: number
            newLine?: string
            showHeaders?: boolean
            showMoveCursor?: boolean
            wrapMoves?: boolean
        }
    }
    type MoveOptions = {
        orig: number
        dest: number
        movedPiece: Piece
        capturedPiece: Piece | null
        promotionPiece: Piece | null
        flags: number[]
    }
}
export { ChessOptions, MethodOptions }
