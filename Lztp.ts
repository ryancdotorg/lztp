// SPDX-License-Identifier: BSD-3-Clause
// Copyright © 2018 HUMAN Security, Inc.
// Author: Ryan Castellucci

/*/// <reference path="Array8.ts"/>*/
/*/// <reference path="SimpleMap.ts"/>*/

const _charCodeAt = function(s: string, p: number): number { return s.charCodeAt(p); };
const _fromCharCode = String.fromCharCode;
const _now = Date.now;

declare var setImmediate;
const runSoon = function(fn: any): void {
    typeof setImmediate === "function" ? setImmediate(fn) : setTimeout(fn, 0);
};

interface LztpCallback { (result: string): void }

interface ILztp {
    encode(data: string, callback: LztpCallback): string;
    /* BEGIN_DECODE */
    decode(data: string): string;
    /* BEGIN_ANALYZE */
    analyze(data: string, counts: any): number;
    getSeed(): Array<string>;
    /* END_ANALYZE */
    /* END_DECODE */
    setSeed(seed: Array<string>): void;
}

// This convoluted decleration spits out a function typed such that can be
// called with `new` to produce an `ILztp` object.
const Lztp: { new (): ILztp; } = ((): { new (): ILztp; } => {
    // dictionary starts with two reserved symbols for adding new characters
    const LSYM = 2;
    // first and last character codes
    const CMIN = 32;  // ' ' (space)
    const CMAX = 124; // '|' (pipe)
    // number of character codes
    const CNUM = (CMAX-CMIN)+1;
    // maximum possible dictionary size
    const DMAX = (CNUM-LSYM)*CNUM;

    /* BEGIN_DECODE */
    const RMAP = new Uint8Array(256);
    for (let i = 0; i < 256; ++i) { RMAP[i] = 255; }
    /* END_DECODE */

    // map base CNUM numbers to encoded characters
    const CMAP = new Uint8Array(CNUM);
    for (let i = 0, j = CMIN; i < CNUM; ++i, ++j) {
        // avoid using backslash or double-quote as they need escaping
        if (j == 34 || j == 92) { ++j; }
        CMAP[i] = j;
        /* BEGIN_DECODE */
        RMAP[j] = i;
        /* END_DECODE */
    }

    /*
    const RMAP = new Uint8Array(256);
    for (let i = 0; i < 256; ++i) { RMAP[i] = 255; }
    for (let i = 0, j = CMIN; i < CNUM; ++i, ++j) {
        // backslash and double-quote aren't used
        if (j == 34 || j == 92) { ++j; }
        RMAP[j] = i;
    }
    */

    // dictionary pre-seed array, use generate-seed.js to build
    var pre = (' `e`o`t`a`i`n`s`r`u`l`h`d`c`m`p`y`g`w`e `b`f`k`.`t `:` t`v`in`'+
    's `,`/` i` a`I`-`th`d `?`\'`er`re`1`an`he`on`x`o `, `0`n ` s`ou`or`st`4`'+
    'y `it` w`ha`2`j`S`"`T`at`es`_` th`r `3`is`A`nt`)`ve`D`se`te`to` o`U`le`al'+
    '`en` c`C`P`6`ti').split('`');

    // number of entries from dictionary pre-seed array to use (all of them)
    var SEED = pre.length;

    const Lztp = <any> function(): ILztp {
        // return object
        return this;
    };

    // _encodeWork(txt, len, ipos, CCHR, DCHR, dict, dict_sz, last, out, opos, callback);
    // this is kinda scary looking :-/
    const _encodeWork = function(
        txt: string, len: number, ipos: number,
        CCHR: number, DCHR: number,
        dict: Map<string, number>, dict_sz: number, last: string,
        out: Array<number>, opos: number,
        callback?: LztpCallback
    ): string {
        var i: number, cc: number, sym: number, w: string, tmp: any,
            t0: number = _now(), res: string, ostart: number;

        // map symbol to character code and write to output
        const writeC = (c: number) => { out[opos++] = CMAP[c]; }

        // main compression loop
        while (ipos < len) {
            ostart = opos;
            i = 1;
            // find the longest match in the dictionary starting at the current position
            // symbol for match is ends up in `sym`, new entry to be added in `w`
            while ((tmp = dict.get(w = txt.substr(ipos, i))) && i <= (len - ipos)) { sym = tmp; ++i; }
            --i; // decrement i to reflect longest substring actually found
            if (i == 0) { // no match at all in the dictionary, need to add a character
                cc = _charCodeAt(w, 0);
                if (cc >= CMIN && cc <= CMAX) {
                    // encode character as literal
                    writeC(0); // reserved symbol
                    writeC(cc - CMIN);
                } else {
                    // encode character as pseudo-base64
                    // the last b64 character will use all 6 bits
                    // the second to last will use five bits and have the top bit set to zero
                    // the others will use five bits and have the top bit set to one
                    writeC(1); // reserved symbol
                    // representable in two characters?
                    if (cc < 0x0800) {
                        // 0xxxxx xxxxxx (11 bits)
                        writeC((cc >> 6));   // 5 most signifigant bits
                        writeC((cc & 0x3f)); // 6 least signifigant bits
                    // valid surrogate pair?
                    } else if (
                        (cc & 0xfc00) == 0xd800 &&
                        ((tmp = _charCodeAt(txt, ipos+1)) & 0xfc00) == 0xdc00
                    ) {
                        // compute code point from surrogate pair
                        cc = (cc - 0xd800) * 0x400 + (tmp - 0xdc00) + 0x10000;
                        // 1xxxxx 1xxxxx 0xxxxx xxxxxx (21 bits)
                        writeC(((cc >> 16) | 0x20));        // 5 most signifigant bits
                        writeC(((cc >> 11) & 0x1f | 0x20)); // 5 more bits
                        writeC(((cc >> 6)  & 0x1f));        // 5 more bits
                        writeC((cc & 0x3f));                // 6 least signifigant bits
                        // update w and advance ipos to reflect consumption
                        // of two characters from the input string
                        w = txt.substr(ipos++, 2);
                    // everything else is 16 bits
                    } else {
                        // this can encode unpaired surrogates
                        // 1xxxxx 0xxxxx xxxxxx (16 bits)
                        writeC(((cc >> 11) | 0x20)); // 5 most signifigant bits
                        writeC(((cc >> 6)  & 0x1f)); // 5 more bits
                        writeC((cc & 0x3f));         // 6 least signifigant bits
                    }
                }
                // add entry for `w` to dictionary
                if (dict_sz < DMAX) {
                    dict.set(w, dict_sz++);
                    w += txt.charAt(++ipos);
                    //if (++ipos < len) { w += txt.charAt(ipos); }
                } else {
                    ++ipos;
                }
            } else {
                // advance ipos by length of symbol before clobbering i
                ipos += i;
                // as more entries are added to the dictionary, output
                // encoding is adjusted to accomodate them
                if (dict_sz >= DCHR) {
                    CCHR = (CNUM*CNUM-dict_sz)/(CNUM-1)|0;
                    DCHR = CCHR + (CNUM-CCHR)*CNUM;
                }
                // write out the symbol, could be one or two characters
                if (sym < CCHR) {
                    writeC(sym);
                } else {
                    writeC(CCHR + ((sym - CCHR) / CNUM)|0);
                    writeC((sym - CCHR) % CNUM);
                }
            }
            // if there's a queued dictionary entry in `last`, add it now
            if (last && dict_sz < DMAX) { dict.set(last, dict_sz++); }
            // if `w` is different from the entry we just added, queue it for
            // the next round
            if (last != w) { last = w; } else { last = undefined; }

            if (callback && !(i & 63) && (_now() - t0) > 10) {
                runSoon(function(){
                    _encodeWork(
                        txt, len, ipos,
                        CCHR, DCHR,
                        dict, dict_sz, last,
                        out, opos,
                        callback
                    );
                });
                return null;
            }
        }

        // truncate output array (only needed if it was preallocated...)
        out.length = opos;

        // encode and convert output values to string
        res = _fromCharCode.apply(null, out);
        if (callback) {
            runSoon(function(){callback(res);});
            return null;
        } else {
            return res;
        }
    }

    // if a callback is specified this will run asyncronously
    Lztp.prototype.encode = function(txt: string, callback?: LztpCallback): string {
        var i: number, len: number = txt.length, tmp: any,
            // may be faster in some cases to specify a length?
            out: Array<number> = new Array(),
            dict: Map<string, number> = new Map(),
            dict_sz: number = LSYM;

        // initialize compression dictionary from seed
        for (i = 0; i < SEED; ++i) {
            // add seed entry to dictionary
            dict.set(pre[i], dict_sz++);
        }

        return _encodeWork(
            txt, len, 0/*ipos*/,
            CNUM/*CCHR*/, CNUM/*DCHR*/,
            dict, dict_sz, null/*last*/,
            out, 0/*opos*/,
            callback
        );
    }

    /* BEGIN_DECODE */
    Lztp.prototype.decode = function(enc: string): string {
        var n: number, i: number,
            cc: number, cp: number,
            w: string, tmp: any, last: string,
            add_prev: string, next: string,
            len: number = enc.length, ipos: number = 0,
            // may be faster in some cases to specify a length?
            cmpr: Array<number> = new Array(len),
            out: string = '',
            dict: Array<string> = new Array(DMAX),
            dict_sz: number = LSYM,
            CCHR: number = CNUM, // max symbol representable by one char
            DCHR: number = CNUM; // max symbol representable by two chars


        for (i = 0; i < len; ++i) {
            if ((cmpr[i] = RMAP[_charCodeAt(enc, i)]) == 255) {
                throw "bad character at pos " + i;
            }
        }

        const addToDict = (ss: string): void => {
            // is there space in the dictonary?
            if (dict_sz < DMAX) {
                dict[dict_sz++] = ss;
                if (dict_sz >= DCHR) {
                    CCHR = (CNUM*CNUM-dict_sz)/(CNUM-1)|0;
                    DCHR = CCHR + (CNUM-CCHR)*CNUM;
                }
            }
            // else, dict is full, do nothing
        }

        // initialize dictonary from seed
        for (i = 0; i < SEED; ++i) { addToDict(pre[i]); }

        while (ipos < len) {
            cc = cmpr[ipos++];
            if (cc == 0) {
                w = _fromCharCode(cmpr[ipos++] + CMIN);
                out += w;
                if (w != next) { addToDict(w); add_prev = w; }
                if (last) {
                    next = last + w;
                    if (next != add_prev) { addToDict(next); add_prev = next; }
                }
            } else if (cc == 1) {
                cp = 0;
                do {
                    cp = (cp << 5) + (cmpr[ipos] & 0x1f);
                // second to last character has the 0x20 bit cleared
                } while ((cmpr[ipos++] & 0x20) == 0x20);
                // last character uses all six bits
                cp = (cp << 6) + cmpr[ipos++];
                // output utf16 surrogate pair?
                if (cp > 0xffff) {
                    cp -= 0x10000;
                    w = _fromCharCode(cp / 0x400 + 0xd800, cp % 0x400 + 0xdc00);
                } else {
                    w = _fromCharCode(cp);
                }
                out += w;
                if (w != next) { addToDict(w); add_prev = w; }
                if (last) {
                    next = last + w;
                    if (next != add_prev) { addToDict(next); add_prev = next; }
                }
            } else {
                // match from dictonary, single number key
                if (cc < CCHR) {
                    w = dict[cc];
                } else {
                    //cc = (1 + cc - CCHR) * CNUM + cmpr[ipos++] - (CNUM - CCHR);
                    cc = cc * CNUM + cmpr[ipos++] - CNUM * CCHR + CCHR
                    w = dict[cc];
                }
                if (!w) { throw "dictionary entry not found"; }
                out += w;
                if (last) {
                    next = last + w.charAt(0);
                    if (next != add_prev) { addToDict(next); add_prev = next; }
                }
            }
            last = w;
        }

        return out;
    }

    /* BEGIN_ANALYZE */
    // read input and generate dictionary without generating output
    Lztp.prototype.analyze = function(txt: string, counts: any): number {
        var i: number, cc: number, sym: string,
            w: string, tmp: any, last: string,
            len: number = txt.length, ipos: number = 0,
            dict: Map<string, number> = new Map(),
            dict_sz: number = LSYM;

        while (i = 1, ipos < len) {
            while ((tmp = dict.get(w = txt.substr(ipos, i))) && i <= (len - ipos)) { sym = tmp; ++i; }
            if (i-- == 0) {
                cc = _charCodeAt(w, 0);
                if ((cc & 0xfc00) == 0xd800 && (_charCodeAt(txt, ipos+1) & 0xfc00) == 0xdc00) {
                    w = txt.substr(ipos++, 2);
                }
                dict.set(w, dict_sz++);
                w = undefined;
                ++ipos;
            } else {
                ipos += i;
                counts[w.substr(0, i)] = w.substr(0, i) in counts ? counts[w.substr(0, i)] + 1 : 1;
            }
            if (last) { dict.set(last, dict_sz++); }
            last = last == w ? undefined : w;
        }
        return dict_sz;
    }
    /* END_ANALYZE */

    Lztp.prototype.getSeed = function(): Array<string> { return pre; }
    /* END_DECODE */

    Lztp.prototype.setSeed = function(seed: Array<string>): void {
        pre = seed;
        SEED = pre.length;
    }

    return Lztp;
})();

declare var module, require;
if (typeof module !== "undefined" && module !== require.main) {
    module.exports = Lztp;
} else if (typeof (window as any) !== "undefined") {
    (window as any)["LZTP"] = Lztp;
}
