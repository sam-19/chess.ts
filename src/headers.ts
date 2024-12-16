import { Log } from 'scoped-event-log'
import { AnyHeader, GameHeaders } from './types/headers'

const SCOPE = 'headers'

/**
 * Support class for managing game headers.
 */
export default class ChessHeaders implements GameHeaders {
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
        timecontrol: 'ChessTimer',
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

    /**
     * Check if a header `value` is valid for a given header `key`.
     * @param key - Header key.
     * @param value - Header value to validate.
     * @returns True if value is valid for the key, false otherwise.
     */
    static readonly ValidateValue = (key: AnyHeader, value: string) => {
        const validationMap = new Map<AnyHeader, { allowed: (string | RegExp)[], error: string }>([
            ['blackelo', {
                allowed: [/^\d\d?\d?\d?$/],
                error: `'${value}' must be a positive integer with up to four digits.`
            }],
            ['date', {
                allowed: [/^\d\d\d\d\.\d\d\.\d\d$/],
                error: `'${value}' does not match allowed pattern 'YYYY.MM.DD'.`
            }],
            ['eco', {
                allowed: [/^[A-E]\d\d(\/\d\d)?$/],
                error: `'${value}' does not match allowed pattern '(A-E)##', with optional suffix '/##'.`
            }],
            ['plycount', {
                allowed: [/^\d\d?\d?\d?$/],
                error: `'${value}' must be a positive integer with up to four digits.`
            }],
            ['setup', {
                allowed: [/^[01]$/],
                error: `'${value}' must be either 0 or 1.`
            }],
            ['termination', {
                allowed: [
                    "abandoned", "adjudication", "death", "emergency", "normal",
                    "rules infraction", "time forfeit", "unterminated"
                ],
                error: `'${value}' is not an allowed value.`
            }],
            ['time', {
                allowed: [/^\d\d:\d\d(:\d\d)?$/],
                error: `'${value}' does not match allowed pattern 'HH:MM:SS' (seconds are optional).`
            }],
            ['utcdate', {
                allowed: [/^\d\d\d\d\.\d\d\.\d\d$/],
                error: `'${value}' does not match allowed pattern 'YYYY.MM.DD'.`
            }],
            ['utctime', {
                allowed: [/^\d\d:\d\d:(\d\d)$/],
                error: `'${value}' does not match allowed pattern 'HH:MM:SS' (seconds are optional).`
            }],
            ['whiteelo', {
                allowed: [/^\d\d?\d?\d?$/],
                error: `'${value}' must be a positive integer with up to four digits.`
            }],
        ])
        const validation = validationMap.get(key.toLowerCase())
        if (!validation ||
            validation.allowed.includes(value) ||
            validation.allowed.filter(v => typeof v !== 'string').some(r => value.match(r))
        ) {
            return true
        }
        Log.error(`Cannot set header, ` + validation.error, SCOPE)
        return false
    }

    // Instance properties
    protected _keys: AnyHeader[] = []
    protected _headers = new Map<AnyHeader, string>()
    /**
     * Create a new game headers object with the given key-value pairs.
     * @param headers [key: string, value: string][]
     */
    constructor (headers: [AnyHeader, string][] = []) {
        this.add(headers)
    }

    add (headers: string[][]) {
        for (let i=0; i<headers.length; i++) {
            this.set(headers[i][0], headers[i][1])
        }
    }

    clear () {
        this._keys = []
        this._headers.clear()
    }

    export (reduced = false) {
        // Check if headers meet the export criteria as per
        // http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c3.2
        const exportHdrs = new Map<string, string>()
        const requiredKeys = ['event', 'site', 'date', 'round', 'white', 'black', 'result']
        for (const key of requiredKeys) {
            const hdrValue = this._headers.get(key)
            const stdKey = ChessHeaders.KEYS[key as keyof typeof ChessHeaders.KEYS]
            if (hdrValue === undefined) {
                Log.error(`Headers are missing required field ${stdKey}.`, SCOPE)
                continue
            }
            exportHdrs.set(stdKey, hdrValue)
        }
        if (exportHdrs.size < requiredKeys.length) {
            return null
        }
        if (reduced) {
            // Reduced archival format only contains the mandatory headers
            return exportHdrs
        }
        // Add the rest of the headers in alphabetical order
        for (const key of Object.keys(ChessHeaders.KEYS)) {
            if (requiredKeys.indexOf(key) === -1) {
                const hdrValue = this._headers.get(key)
                if (hdrValue) {
                    exportHdrs.set(ChessHeaders.KEYS[key as keyof typeof ChessHeaders.KEYS], hdrValue)
                }
            }
        }
        return exportHdrs
    }

    get (key: AnyHeader) {
        if (this._headers.get(key.toLowerCase()) !== undefined) {
            return this._headers.get(key.toLowerCase())
        } else {
            return undefined
        }
    }

    getAll () {
        return this.standardized()
    }

    getKey (i: number) {
        if (this._keys[i] !== undefined && ChessHeaders.KEYS[this._keys[i] as keyof typeof ChessHeaders.KEYS] !== undefined) {
            return ChessHeaders.KEYS[this._keys[i] as keyof typeof ChessHeaders.KEYS]
        } else {
            return undefined
        }
    }

    getValue (i: number) {
        if (this._headers.get(this._keys[i]) !== undefined)
            return this._headers.get(this._keys[i])
        else
            return undefined
    }

    length () {
        return this._keys.length
    }

    remove (key: AnyHeader) {
        if (this._headers.has(key.toLowerCase())) {
            this._headers.delete(
                this._keys.splice(this._keys.indexOf(key.toLowerCase()), 1)[0]
            )
        }
    }

    removeAllExcept (preserve: AnyHeader | AnyHeader[]) {
        // Convert to array if single string
        if (typeof preserve === 'string') {
            preserve = [preserve]
        }
        // Convert all to lower case to match with header keys
        preserve = preserve.map(key => key.toLowerCase())
        for (let i=0; i<this._keys.length; i++) {
            if (preserve.indexOf(this._keys[i]) === -1) {
                this._headers.delete(this._keys.splice(i, 1)[0])
                i--
            }
        }
    }

    set (key: AnyHeader, value: string) {
        if (
            Object.keys(ChessHeaders.KEYS).indexOf(key.toLowerCase()) === -1 ||
            !ChessHeaders.ValidateValue(key, value)
        ) {
            return
        }
        if (this._keys.indexOf(key.toLowerCase()) === -1) {
            this._keys.push(key.toLowerCase())
        }
        this._headers.set(key.toLowerCase(), value)
    }

    standardized (): { [key: AnyHeader]: string } {
        const headers = {} as { [key: string]: string }
        for (const k of this._keys) {
            // At this point the user submitted headers have been checked twice against the
            // list of supported values and there is no second level property (at least not yet).
            const h = this._headers.get(k)
            if (h) {
                headers[ChessHeaders.KEYS[k as keyof typeof ChessHeaders.KEYS]] = h
            }
        }
        return headers
    }

    toJSON () {
        return JSON.stringify(this.standardized())
    }

    toString () {
        return "{ " + this._keys.map(key => `${ChessHeaders.KEYS[key as keyof typeof ChessHeaders.KEYS]}: ${this._headers.get(key)}`).join('; ') + " }"
    }
}