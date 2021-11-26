interface GameHeaders {
    addHeaders: (headers: string[][]) => void
    clear: () => void
    get: (k: string) => { [key: string]: string } | undefined
    getAll: () => { [key: string]: string }[]
    getKey: (i: number) => string | undefined
    getValue: (i: number) => string | undefined
    length: () => number
    remove: (k: string) => void
    removeAllExcept: (preserve: string | string[]) => void
    set: (key: string, value: string) => void
    standardized: () => { [key: string]: string }[]
    toJSON: () => string
    toString: () => string
}

export { GameHeaders }
