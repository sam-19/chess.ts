interface MoveFlags {
    flags: number[]
    length: number
    add: (flag: number) => void
    clear: () => void
    contains: (flag: number) => boolean
    copy: () => MoveFlags
    remove: (falg: number) => void
    replace: (old: number, flag: number, silent: boolean) => void
}

export { MoveFlags }
