type NagEntry = { code: number, symbol: string[], description: string }

interface MoveNag {
    code: number
    nag: NagEntry | null
    value: NagEntry | null
}

export { MoveNag, NagEntry }
