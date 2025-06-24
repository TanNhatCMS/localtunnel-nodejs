import { Transform, TransformCallback } from 'stream';

interface HeaderHostTransformerOptions {
    host?: string;
}

export default class HeaderHostTransformer extends Transform {
    private host: string;
    private replaced: boolean;

    constructor(opts: HeaderHostTransformerOptions = {}) {
        super();
        this.host = opts.host || 'localhost';
        this.replaced = false;
    }

    _transform(
        chunk: Buffer | string,
        _encoding: BufferEncoding,
        callback: TransformCallback
    ): void {
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
