import { EventEmitter } from 'events';
interface TunnelOptions {
    host?: string;
    port?: number;
    local_host?: string;
    local_https?: boolean;
    local_cert?: string;
    local_key?: string;
    local_ca?: string;
    allow_invalid_cert?: boolean;
    subdomain?: string;
    [key: string]: any;
}
type OpenCallback = (err?: Error | null) => void;
export default class Tunnel extends EventEmitter {
    private opts;
    private closed;
    private tunnelCluster?;
    clientId?: string;
    url?: string;
    cachedUrl?: string;
    constructor(opts?: TunnelOptions);
    private _getInfo;
    private _init;
    private _establish;
    open(cb: OpenCallback): void;
    close(): void;
}
export {};
