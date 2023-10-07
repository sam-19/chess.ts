import Log from 'scoped-ts-log'
import { GameHeaders } from './types/headers'

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
    // Instance properties
    keys: string[] = []
    headers = new Map<string,string>()
    /**
     * Create a new game headers object with the given key-value pairs.
     * @param headers [key: string, value: string][]
     */
    constructor (headers: string[][] = []) {
        this.add(headers)
    }

    add (headers: string[][]) {
        for (let i=0; i<headers.length; i++) {
            this.set(headers[i][0], headers[i][1])
        }
    }

    clear () {
        this.keys = []
        this.headers.clear()
    }

    export (reduced = false) {
        // Check if headers meet the export criteria as per
        // http://www.saremba.de/chessgml/standards/pgn/pgn-complete.htm#c3.2
        const exportHdrs = new Map<string, string>()
        const requiredKeys = ['event', 'site', 'date', 'round', 'white', 'black', 'result']
        for (const key of requiredKeys) {
            const hdrValue = this.headers.get(key)
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
                const hdrValue = this.headers.get(key)
                if (hdrValue) {
                    exportHdrs.set(ChessHeaders.KEYS[key as keyof typeof ChessHeaders.KEYS], hdrValue)
                }
            }
        }
        return exportHdrs
    }

    get (k: string) {
        if (this.headers.get(k.toLowerCase()) !== undefined) {
            return this.headers.get(k.toLowerCase())
        } else {
            return undefined
        }
    }

    getAll () {
        return this.standardized()
    }

    getKey (i: number) {
        if (this.keys[i] !== undefined && ChessHeaders.KEYS[this.keys[i] as keyof typeof ChessHeaders.KEYS] !== undefined) {
            return ChessHeaders.KEYS[this.keys[i] as keyof typeof ChessHeaders.KEYS]
        } else {
            return undefined
        }
    }

    getValue (i: number) {
        if (this.headers.get(this.keys[i]) !== undefined)
            return this.headers.get(this.keys[i])
        else
            return undefined
    }

    length () {
        return this.keys.length
    }

    remove (k: string) {
        if (this.headers.has(k.toLowerCase())) {
            this.headers.delete(
                this.keys.splice(this.keys.indexOf(k.toLowerCase()), 1)[0]
            )
        }
    }

    removeAllExcept (preserve: string | string[]) {
        // Convert to array if single string
        if (typeof preserve === 'string') {
            preserve = [preserve]
        }
        // Convert all to lower case to match with header keys
        preserve = preserve.map(key => key.toLowerCase())
        for (let i=0; i<this.keys.length; i++) {
            if (preserve.indexOf(this.keys[i]) === -1) {
                this.headers.delete(this.keys.splice(i, 1)[0])
                i--
            }
        }
    }

    set (key: string, value: string) {
        if (Object.keys(ChessHeaders.KEYS).indexOf(key.toLowerCase()) === -1) {
            return
        }
        if (this.keys.indexOf(key.toLowerCase()) === -1) {
            this.keys.push(key.toLowerCase())
        }
        this.headers.set(key.toLowerCase(), value)
    }

    standardized (): { [key: string]: string } {
        const headers = {} as { [key: string]: string }
        for (const k of this.keys) {
            // At this point the user submitted headers have been checked twice against the
            // list of supported values and there is no second level property (at least not yet).
            const h = this.headers.get(k)
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
        return "{ " + this.keys.map(key => `${ChessHeaders.KEYS[key as keyof typeof ChessHeaders.KEYS]}: ${this.headers.get(key)}`).join('; ') + " }"
    }
}