import { GameHeaders } from '../types/headers'
/**
 * Support class for managing game headers.
 */
class Headers implements GameHeaders {
    // Static properties
    // List of valid headers with correct capitalization
    static readonly KEYS = {
        annotator: 'Annotator',
        black: 'Black',
        blackelo: 'BlackElo',
        blackna: 'BlackNA',
        blacktitle: 'BlackTitle',
        blacktype: 'BlackType',
        blackuscf: 'BlackUSCF',
        board: 'Board',
        date: 'Date',
        eco: 'ECO',
        event: 'Event',
        eventdate: 'EventDate',
        eventsponsor: 'EventSponsor',
        fen: 'FEN',
        mode: 'Mode',
        nic: 'NIC',
        opening: 'Opening',
        plycount: 'PlyCount',
        result: 'Result',
        round: 'Round',
        section: 'Section',
        setup: 'SetUp',
        site: 'Site',
        stage: 'Stage',
        subvariation: 'SubVariation',
        termination: 'Termination',
        time: 'Time',
        timecontrol: 'TimeControl',
        utcdate: 'UTCDate',
        utctime: 'UTCTime',
        variation: 'Variation',
        white: 'White',
        whiteelo: 'WhiteElo',
        whitena: 'WhiteNA',
        whitetitle: 'WhiteTitle',
        whitetype: 'WhiteType',
        whiteuscf: 'WhiteUSCF',
    }
    // Instance properties
    keys: string[] = []
    headers: any = {}
    /**
     * Create a new game headers object with the given key-value pairs.
     * @param headers [key: string, value: string][]
     */
    constructor (headers: string[][] = []) {
        this.addHeaders(headers)
    }
    /**
     * Add all headers from the given array of key-value pairs.
     * @param headers [key: string, value: string][]
     */
    addHeaders (headers: string[][]) {
        for (let i=0; i<headers.length; i++) {
            this.set(headers[i][0], headers[i][1])
        }
    }
    /**
     * Clear all headers.
     */
    clear () {
        this.keys = []
        this.headers = {}
    }
    /**
     * Return header value at k.
     * @param k header key
     * @returns header value string
     */
    get (k: string) {
        if (this.headers[k.toLowerCase()] !== undefined) {
            return this.headers[k.toLowerCase()]
        } else {
            return undefined
        }
    }
    /**
     * Return all headers with standardized key capitalization.
     * @returns headers
     */
    getAll () {
        return this.standardized()
    }
    /**
     * Get key at index i.
     * @param i
     * @returns heaedr key string
     */
    getKey (i: number) {
        if (this.keys[i] !== undefined && Headers.KEYS[this.keys[i] as keyof typeof Headers.KEYS] !== undefined) {
            return Headers.KEYS[this.keys[i] as keyof typeof Headers.KEYS]
        } else {
            return undefined
        }
    }
    /**
     * Get header value at key index i.
     * @param i
     * @returns header value string
     */
    getValue (i: number) {
        if (this.headers[this.keys[i]] !== undefined)
            return this.headers[this.keys[i]]
        else
            return undefined
    }
    /**
     * Return the number of headers stored in this object.
     * @returns number of headers
     */
    length () {
        return this.keys.length
    }
    /**
     * Remove a header by key.
     * @param k
     */
    remove (k: string) {
        if (k.toLowerCase() in this.headers) {
            delete this.headers[
                this.keys.splice(this.keys.indexOf(k.toLowerCase()), 1)[0]
            ]
        }
    }
    /**
     * Remove all headers except the given keys (array).
     * @param preserve key or array of keys to preserve (case-insensitive)
     */
    removeAllExcept (preserve: string | string[]) {
        // Convert to array if single string
        if (typeof preserve === 'string') {
            preserve = [preserve]
        }
        // Convert all to lower case to match with header keys
        preserve = preserve.map(key => key.toLowerCase())
        for (let i=0; i<this.keys.length; i++) {
            if (preserve.indexOf(this.keys[i]) === -1) {
                delete this.headers[this.keys.splice(i, 1)[0]]
            }
        }
    }
    /**
     * Update header value at key or add it to headers.
     * @param key header key
     * @param value header value
     */
    set (key: string, value: string) {
        if (this.keys.indexOf(key.toLowerCase()) === -1) {
            this.keys.push(key.toLowerCase())
        }
        this.headers[key.toLowerCase()] = value
    }
    /**
     * Return headers with standardized keys.
     */
    standardized (): { [key: string]: string }[] {
        const headers = {} as any
        this.keys.forEach((k) => {
            headers[Headers.KEYS[k as keyof typeof Headers.KEYS]] = this.headers[k]
        })
        return headers
    }
    /**
     * Convert these game headers into a JSON string.
     * @returns JSON string of the game headers
     */
    toJSON () {
        return JSON.stringify(this.standardized())
    }
    /**
     * Get a string representation of the game headers.
     * @returns a string of game headers as { key_1: value_1, ... key_n: value_n }
     */
    toString () {
        return "{ " + this.keys.map(key => `${Headers.KEYS[key as keyof typeof Headers.KEYS]}: ${this.headers[key]}`).join(', ') + " }"
    }
}

export default Headers
