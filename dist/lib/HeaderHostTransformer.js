"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
class HeaderHostTransformer extends stream_1.Transform {
    host;
    replaced;
    constructor(opts = {}) {
        super();
        this.host = opts.host || 'localhost';
        this.replaced = false;
    }
    _transform(chunk, _encoding, callback) {
        if (this.replaced) {
            callback(null, chunk);
            return;
        }
        const data = chunk.toString();
        const replacedData = data.replace(/(\r\n[Hh]ost: )\S+/, (match, $1) => {
            this.replaced = true;
            return $1 + this.host;
        });
        callback(null, replacedData);
    }
}
exports.default = HeaderHostTransformer;
