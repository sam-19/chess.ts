import { MoveNag, NagEntry } from './types/nag'
import { Log } from 'scoped-event-log'

const SCOPE = 'nag'

export default class Nag implements MoveNag {
    // Static properties
    static readonly LIST = [
        { code: 0, symbol: [], description: ''},
        { code: 1, symbol: ['!'], description: 'good move'},
        { code: 2, symbol: ['?'], description: 'poor move'},
        { code: 3, symbol: ['‼', '!!'], description: 'brilliant move'},
        { code: 4, symbol: ['⁇', '??'], description: 'blunder'},
        { code: 5, symbol: ['⁉', '!?'], description: 'interesting move'},
        { code: 6, symbol: ['⁈', '?!'], description: 'questionable move'},
        { code: 7, symbol: ['&square;', '□'], description: 'forced move'},
        { code: 8, symbol: [], description: 'singular move'},
        { code: 9, symbol: [], description: 'worst move'},
        { code: 10, symbol: ['='], description: 'even position'},
        { code: 11, symbol: [], description: 'equal chances, quiet position'},
        { code: 12, symbol: [], description: 'equal chances, active position'},
        { code: 13, symbol: ['&infin;', '∞'], description: 'unclear position'},
        { code: 14, symbol: ['&pluse;', '⩲'], description: 'white has slight advantage'},
        { code: 15, symbol: ['&eplus;', '⩱'], description: 'black has slight advantage'},
        { code: 16, symbol: ['&plusmn;', '±'], description: 'white has moderate advantage'},
        { code: 17, symbol: ['&mnplus;', '∓'], description: 'black has moderate advantage'},
        { code: 18, symbol: ['+-'], description: 'white has decisive advantage'},
        { code: 19, symbol: ['-+'], description: 'black has decisive advantage'},
        { code: 20, symbol: [], description: 'white has crushing advantage'},
        { code: 21, symbol: [], description: 'black has crushing advantage'},
        { code: 22, symbol: ['&xodot;', '⨀'], description: 'white is in zugzwang'},
        { code: 23, symbol: ['&xodot;', '⨀'], description: 'black is in zugzwang'},
        { code: 24, symbol: [], description: 'white has slight space advantage'},
        { code: 25, symbol: [], description: 'black has slight space advantage'},
        { code: 26, symbol: [], description: 'white has moderate space advantage'},
        { code: 27, symbol: [], description: 'black has moderate space advantage'},
        { code: 28, symbol: [], description: 'white has decisive space advantage'},
        { code: 29, symbol: [], description: 'black has decisive space advantage'},
        { code: 30, symbol: [], description: 'white has slight time advantage'},
        { code: 31, symbol: [], description: 'black has slight time advantage'},
        { code: 32, symbol: ['⟳'], description: 'white has moderate time advantage'},
        { code: 33, symbol: ['⟳'], description: 'black has moderate time advantage'},
        { code: 34, symbol: [], description: 'white has decisive time advantage'},
        { code: 35, symbol: [], description: 'black has decisive time advantage'},
        { code: 36, symbol: ['&rarr;', '→'], description: 'white has the initiative'},
        { code: 37, symbol: ['&rarr;', '→'], description: 'black has the initiative'},
        { code: 38, symbol: [], description: 'white has a lasting initiative'},
        { code: 39, symbol: [], description: 'black has a lasting initiative'},
        { code: 40, symbol: ['&uarr;', '↑'], description: 'white has the attack'},
        { code: 41, symbol: ['&uarr;', '↑'], description: 'black has the attack'},
        { code: 42, symbol: [], description: 'white has insufficient compensation for material deficit'},
        { code: 43, symbol: [], description: 'black has insufficient compensation for material deficit'},
        { code: 44, symbol: [], description: 'white has sufficient compensation for material deficit'},
        { code: 45, symbol: [], description: 'black has sufficient compensation for material deficit'},
        { code: 46, symbol: [], description: 'white has more than adquate compensation for material deficit'},
        { code: 47, symbol: [], description: 'black has more than adquate compensation for material deficit'},
        { code: 48, symbol: [], description: 'white has a slight center control advantage'},
        { code: 49, symbol: [], description: 'black has a slight center control advantage'},
        { code: 50, symbol: [], description: 'white has a moderate center control advantage'},
        { code: 51, symbol: [], description: 'black has a moderate center control advantage'},
        { code: 52, symbol: [], description: 'white has a decisive center control advantage'},
        { code: 53, symbol: [], description: 'black has a decisive center control advantage'},
        { code: 54, symbol: [], description: 'white has a slight kingside control advantage'},
        { code: 55, symbol: [], description: 'black has a slight kingside control advantage'},
        { code: 56, symbol: [], description: 'white has a moderate kingside control advantage'},
        { code: 57, symbol: [], description: 'black has a moderate kingside control advantage'},
        { code: 58, symbol: [], description: 'white has a decisive kingside control advantage'},
        { code: 59, symbol: [], description: 'black has a decisive kingside control advantage'},
        { code: 60, symbol: [], description: 'white has a slight queenside control advantage'},
        { code: 61, symbol: [], description: 'black has a slight queenside control advantage'},
        { code: 62, symbol: [], description: 'white has a moderate queenside control advantage'},
        { code: 63, symbol: [], description: 'black has a moderate queenside control advantage'},
        { code: 64, symbol: [], description: 'white has a decisive queenside control advantage'},
        { code: 65, symbol: [], description: 'black has a decisive queenside control advantage'},
        { code: 66, symbol: [], description: 'white has a vulnerable first rank'},
        { code: 67, symbol: [], description: 'black has a vulnerable first rank'},
        { code: 68, symbol: [], description: 'white has a well protected'},
        { code: 69, symbol: [], description: 'black has a well protected'},
        { code: 70, symbol: [], description: 'white has a poorly protected king'},
        { code: 71, symbol: [], description: 'black has a poorly protected king'},
        { code: 72, symbol: [], description: 'white has a well protected king'},
        { code: 73, symbol: [], description: 'black has a well protected king'},
        { code: 74, symbol: [], description: 'white has a poorly placed king'},
        { code: 75, symbol: [], description: 'black has a poorly placed king'},
        { code: 76, symbol: [], description: 'white has a well placed king'},
        { code: 77, symbol: [], description: 'black has a well placed king'},
        { code: 78, symbol: [], description: 'white has a very weak pawn structure'},
        { code: 79, symbol: [], description: 'black has a very weak pawn structure'},
        { code: 80, symbol: [], description: 'white has a moderately weak pawn structure'},
        { code: 81, symbol: [], description: 'black has a moderately weak pawn structure'},
        { code: 82, symbol: [], description: 'white has a moderately strong pawn structure'},
        { code: 83, symbol: [], description: 'black has a moderately strong pawn structure'},
        { code: 84, symbol: [], description: 'white has a very strong pawn structure'},
        { code: 85, symbol: [], description: 'black has a very strong pawn structure'},
        { code: 86, symbol: [], description: 'white has poor knight placement'},
        { code: 87, symbol: [], description: 'black has poor knight placement'},
        { code: 88, symbol: [], description: 'white has good knight placement'},
        { code: 89, symbol: [], description: 'black has good knight placement'},
        { code: 90, symbol: [], description: 'white has poor bishop placement'},
        { code: 91, symbol: [], description: 'black has poor bishop placement'},
        { code: 92, symbol: [], description: 'white has good bishop placement'},
        { code: 93, symbol: [], description: 'black has good bishop placement'},
        { code: 94, symbol: [], description: 'white has poor rook placement'},
        { code: 95, symbol: [], description: 'black has poor rook placement'},
        { code: 96, symbol: [], description: 'white has good rook placement'},
        { code: 97, symbol: [], description: 'black has good rook placement'},
        { code: 98, symbol: [], description: 'white has poor queen placement'},
        { code: 99, symbol: [], description: 'black has poor queen placement'},
        { code: 100, symbol: [], description: 'white has good queen placement'},
        { code: 101, symbol: [], description: 'black has good queen placement'},
        { code: 102, symbol: [], description: 'white has poor piece coordination'},
        { code: 103, symbol: [], description: 'black has poor piece coordination'},
        { code: 104, symbol: [], description: 'white has good piece coordination'},
        { code: 105, symbol: [], description: 'black has good piece coordination'},
        { code: 106, symbol: [], description: 'white has played the opening very poorly'},
        { code: 107, symbol: [], description: 'black has played the opening very poorly'},
        { code: 108, symbol: [], description: 'white has played the opening poorly'},
        { code: 109, symbol: [], description: 'black has played the opening poorly'},
        { code: 110, symbol: [], description: 'white has played the opening well'},
        { code: 111, symbol: [], description: 'black has played the opening well'},
        { code: 112, symbol: [], description: 'white has played the opening very well'},
        { code: 113, symbol: [], description: 'black has played the opening very well'},
        { code: 114, symbol: [], description: 'white has played the middlegame very poorly'},
        { code: 115, symbol: [], description: 'black has played the middlegame very poorly'},
        { code: 116, symbol: [], description: 'white has played the middlegame poorly'},
        { code: 117, symbol: [], description: 'black has played the middlegame poorly'},
        { code: 118, symbol: [], description: 'white has played the middlegame well'},
        { code: 119, symbol: [], description: 'black has played the middlegame well'},
        { code: 120, symbol: [], description: 'white has played the middlegame very well'},
        { code: 121, symbol: [], description: 'black has played the middlegame very well'},
        { code: 122, symbol: [], description: 'white has played the endgame very poorly'},
        { code: 123, symbol: [], description: 'black has played the endgame very poorly'},
        { code: 124, symbol: [], description: 'white has played the endgame poorly'},
        { code: 125, symbol: [], description: 'black has played the endgame poorly'},
        { code: 126, symbol: [], description: 'white has played the endgame well'},
        { code: 127, symbol: [], description: 'black has played the endgame well'},
        { code: 128, symbol: [], description: 'white has played the endgame very well'},
        { code: 129, symbol: [], description: 'black has played the endgame very well'},
        { code: 130, symbol: [], description: 'white has slight counterplay'},
        { code: 131, symbol: [], description: 'black has slight counterplay'},
        { code: 132, symbol: ['&lrarr;', '⇆'], description: 'white has moderate counterplay'},
        { code: 133, symbol: ['&lrarr;', '⇆'], description: 'black has moderate counterplay'},
        { code: 134, symbol: [], description: 'white has decisive counterplay'},
        { code: 135, symbol: [], description: 'black has decisive counterplay'},
        { code: 136, symbol: [], description: 'white has moderate time control pressure'},
        { code: 137, symbol: [], description: 'black has moderate time control pressure'},
        { code: 138, symbol: ['&xoplus;', '⨁'], description: 'white has severe time control pressure'},
        { code: 139, symbol: ['&xoplus;', '⨁'], description: 'black has severe time control pressure'},
    ] as NagEntry[]
    static forCode = function (code: number | string) {
        for (const nag of Nag.LIST) {
            if (nag.code === code
                || typeof code === 'string' && nag.code === parseInt(code)
            ) {
                return nag
            }
        }
        return null
    }
    static forSymbol = function (symbol: string) {
        for (const nag of Nag.LIST) {
            if (nag.symbol.indexOf(symbol) !== -1) {
                return nag
            }
        }
        return null
    }

    code: number
    nag: NagEntry | null = null

    constructor (code: number) {
        this.code = code
        for (const nag of Nag.LIST) {
            if (nag.code === code) {
                this.nag = nag
                return this
            }
        }
        Log.error(`Could not find mathich NAG for code ${code}.`, SCOPE)
    }

    get value () {
        return this.nag
    }
}