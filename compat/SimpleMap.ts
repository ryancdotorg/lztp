// SPDX-License-Identifier: BSD-3-Clause
// Copyright © 2018 HUMAN Security, Inc.
// Author: Ryan Castellucci

interface Object { hasOwnPropertyName; }
declare var Map;

class SimpleMap {
    private _dict;
    constructor() {
        if (typeof Map === 'function') {
            return (new Map()) as SimpleMap;
        } else {
            this._dict = {};
            return this;
        }
    }

    set(key: string, val: any): SimpleMap {
        this._dict[key] = val;
        return this;
    }

    get(key: string): any {
        return Object.prototype.hasOwnProperty.call(this._dict, key) ? this._dict[key] : undefined;
    }

/* not needed for now
    has(key: string): boolean {
        return Object.prototype.hasOwnPropertyName.call(this._dict, key);
    }

    delete(key: string): boolean {
        if (this.has(key)) {
            delete this._dict[key];
            return true;
        } else {
            return false;
        }
    }
//*/
}
