// SPDX-License-Identifier: BSD-3-Clause
// Copyright © 2018 HUMAN Security, Inc.
// Author: Ryan Castellucci

interface SimpleArray {
    [index:number]: number;
    clone(): SimpleArray;
}

interface CloneableUint8Array extends Uint8Array {
    clone(): SimpleArray;
}

interface CloneableArray extends Array<number> {
    clone(): SimpleArray;
}

const Array8: { new (len: number): SimpleArray; } = <any> function (len: number): SimpleArray {
    var ary;
    if (typeof Uint8Array === 'function') {
        ary = new Uint8Array(len) as CloneableUint8Array;
        ary.clone = function(): SimpleArray {
            var cloned = new Uint8Array(this) as CloneableUint8Array;
            cloned.clone = this.clone;
            return cloned as SimpleArray;
        };
    }
    else {
        ary = new Array<number>(len) as CloneableArray;
        ary.clone = function(): SimpleArray {
            var cloned = this.slice() as CloneableArray;
            cloned.clone = this.clone;
            return cloned;
        };
    }
    return ary;
};
