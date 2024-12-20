export interface GameHeaders {
    /**
     * Add all headers from the given array of key-value pairs.
     * @param headers [key: string, value: string][]
     */
    add: (headers: string[][]) => void

    /**
     * Clear all headers.
     */
    clear: () => void

    /**
     * Get headers arranged in an export format sepcification
     * or null if headers don't meet export criteria.
     * @param reduced - Return only reduced format headers.
     * @returns Headers as a Map or null.
     */
    export: (reduced?: boolean) => Map<string, string> | null

    /**
     * Return header value at k.
     * @param k header key
     * @returns header value string
     */
    get: (k: AnyHeader) => string | undefined

    /**
     * Return all headers with standardized key capitalization.
     * @returns headers
     */
    getAll: () => { [key: AnyHeader]: string }

    /**
     * Get key at index i.
     * @param i
     * @returns heaedr key string
     */
    getKey: (i: number) => string | undefined

    /**
     * Get header value at key index i.
     * @param i
     * @returns header value string
     */
    getValue: (i: number) => string | undefined

    /**
     * Return the number of headers stored in this object.
     * @returns number of headers
     */
    length: () => number

    /**
     * Remove a header by key.
     * @param k
     */
    remove: (k: AnyHeader) => void

    /**
     * Remove all headers except the given keys (array).
     * @param preserve key or array of keys to preserve (case-insensitive)
     */
    removeAllExcept: (preserve: AnyHeader | AnyHeader[]) => void

    /**
     * Update header value at key or add it to headers.
     * @param key header key
     * @param value header value
     */
    set: (key: AnyHeader, value: string) => void

    /**
     * Return headers with standardized keys.
     */
    standardized: () => { [key: AnyHeader]: string }

    /**
     * Convert these game headers into a JSON string.
     * @returns JSON string of the game headers
     */
    toJSON: () => string

    /**
     * Get a string representation of the game headers.
     * @returns a string of game headers as { key_1: value_1, ... key_n: value_n }
     */
    toString: () => string
}

export type RequiredHeaders =
    'Black' | 'Date' | 'Event' | 'Result' | 'Round' | 'Site' | 'White'
    
export type OptionalHeaders =
    'Annotator' | 'FEN' | 'Mode' | 'PlyCount' | 'Termination' | 'Time' | 'TimeControl'

export type AdditionalHeaders =
    'BlackElo' | 'BlackTitle' | 'BlackType' | 'WhiteElo' | 'WhiteTitle' | 'WhiteType'

export type KnownHeaders = AdditionalHeaders | OptionalHeaders | RequiredHeaders

export type AnyHeader = KnownHeaders | string

export type TerminationReason =
    "abandoned" | "adjudication" | "death" | "emergency" | "normal" |
    "rules infraction" | "time forfeit" | "unterminated"