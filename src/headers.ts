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
    headers: Map<string,string> = new Map()
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
        if (this.keys[i] !== undefined && Headers.KEYS[this.keys[i] as keyof typeof Headers.KEYS] !== undefined) {
            return Headers.KEYS[this.keys[i] as keyof typeof Headers.KEYS]
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
        if (k.toLowerCase() in this.headers) {
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
            }
        }
    }

    set (key: string, value: string) {
        if (Object.keys(Headers.KEYS).indexOf(key.toLowerCase()) === -1) {
            return
        }
        if (this.keys.indexOf(key.toLowerCase()) === -1) {
            this.keys.push(key.toLowerCase())
        }
        this.headers.set(key.toLowerCase(), value)
    }

    standardized (): { [key: string]: string } {
        const headers = {} as any
        for (const k of this.keys) {
            // At this point the user submitted headers have been checked twice against the
            // list of supported values and there is no second level property (at least not yet).
            headers.get[Headers.KEYS[k as keyof typeof Headers.KEYS]] = this.headers.get(k)
        }
        return headers
    }

    toJSON () {
        return JSON.stringify(this.standardized())
    }

    toString () {
        return "{ " + this.keys.map(key => `${Headers.KEYS[key as keyof typeof Headers.KEYS]}: ${this.headers.get(key)}`).join('; ') + " }"
    }
}

export default Headers
