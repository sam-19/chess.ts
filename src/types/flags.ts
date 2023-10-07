interface MoveFlags {
    /**
     * List of flags in this collection as number values.
     */
    flags: number[]
    /**
     * Number of flags contained in this collection.
     */
    length: number
    /**
     * Add a flag to this collection.
     */
    add: (flag: number) => void
    /**
     * Remove all flags from this colelction.
     */
    clear: () => void
    /**
     * Check if this collection contains the given flag.
     * @param flag number value of the flag to check for
     */
    contains: (flag: number) => boolean
    /**
     * Copy this collection into an identical collection.
     */
    copy: () => MoveFlags
    /**
     * Remove the given flag from this collection.
     * @param flag number value of the flag to remove
     * @param silent suppress errors encountered during the operation
     */
    remove: (flag: number, silent?: boolean) => void
    /**
     * Replace a flag with another flag.
     * @param old number value of the flag to remove
     * @param flag number value of the flag to add
     * @param silent suppress errors encountered during the operation
     */
    replace: (old: number, flag: number, silent?: boolean) => void
}

export { MoveFlags }
