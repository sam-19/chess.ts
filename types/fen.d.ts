type FenValidationResult = { isValid: boolean, errorCode: number, errorMessage: string }

interface ChessFen {
    invert: () => string
    toString: () => string
    /**
     * Validate the initiated FEN string.
     */
    validate: (onlyPosition?: boolean, rules?: string) => FenValidationResult
}

export { ChessFen, FenValidationResult }
