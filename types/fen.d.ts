
interface ChessFen {
    invert: () => string
    toString: () => string
    validate: (onlyPosition: boolean, rules: string) => { isValid: boolean, errorCode: number, errorMessage: string }
}

export { ChessFen }
