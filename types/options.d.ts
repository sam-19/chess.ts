import Piece from "../src/piece"

type ValidOptions = { [key: string]: string | number | boolean | ((headers: string[][][]) => void) | ((progress: number[]) => void) | null | undefined }
interface ChessOptions {
    assign: (options: ValidOptions) => void
}

declare namespace MethodOptions {
    namespace Board {
        type branchFromParent = {
            continuation?: boolean
        }
        type generateMoves = {
            onlyForSquare?: string | number
            includeSan?: boolean
            includeFen?: boolean
            onlyLegal?: boolean
            skipCheckmate?: boolean
        }
        type getMoves = {
            notation?: 'all' | 'algebraic' | 'san' | 'uci'
            onlyDestinations?: boolean
            includeFen?: boolean
            onlyForSquare?: string | number
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
            updatePosCount?: boolean
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
        type getCapturedPieces = {
            onlyType?: boolean
        }
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
export { ChessOptions, MethodOptions, ValidOptions }
