import { Transform, TransformCallback } from 'stream';
interface HeaderHostTransformerOptions {
    host?: string;
}
export default class HeaderHostTransformer extends Transform {
    private host;
    private replaced;
    constructor(opts?: HeaderHostTransformerOptions);
    _transform(chunk: Buffer | string, _encoding: BufferEncoding, callback: TransformCallback): void;
}
export {};
