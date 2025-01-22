import { BoardSquareIndex, BoardSquareName } from './board'
import { ChessPiece } from "./piece"

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
            detailed?: boolean
            onlyForSquare?: BoardSquareIndex | BoardSquareName
            includeSan?: boolean
            includeFen?: boolean
            onlyLegal?: boolean
            skipCheckmate?: boolean
        }
        type getMoves = {
            detailed?: boolean
            notation?: 'all' | 'algebraic' | 'san' | 'uci'
            onlyDestinations?: boolean
            includeFen?: boolean
            onlyForSquare?: BoardSquareIndex | BoardSquareName
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
            resetGroup?: boolean,
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
        orig: BoardSquareIndex
        dest: BoardSquareIndex
        detail: { [key: string]: string | string[] | number | number[] }
        movedPiece: ChessPiece
        capturedPiece: ChessPiece | null
        promotionPiece: ChessPiece | null
        flags: number[]
    }
}
export { ChessOptions, MethodOptions, ValidOptions }
