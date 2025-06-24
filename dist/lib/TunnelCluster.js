"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const debug_1 = __importDefault(require("debug"));
const fs_1 = __importDefault(require("fs"));
const net_1 = __importDefault(require("net"));
const tls_1 = __importDefault(require("tls"));
const HeaderHostTransformer_1 = __importDefault(require("./HeaderHostTransformer"));
const debug = (0, debug_1.default)('localtunnel:client');
class TunnelCluster extends events_1.EventEmitter {
    opts;
    constructor(opts = {}) {
        super();
        this.opts = opts;
    }
    open() {
        const opt = this.opts;
        const remoteHostOrIp = opt.remote_ip || opt.remote_host;
        const remotePort = opt.remote_port;
        const localHost = opt.local_host || 'localhost';
        const localPort = opt.local_port;
        const localProtocol = opt.local_https ? 'https' : 'http';
        const allowInvalidCert = opt.allow_invalid_cert;
        debug('establishing tunnel %s://%s:%s <> %s:%s', localProtocol, localHost, localPort, remoteHostOrIp, remotePort);
        const remote = net_1.default.connect({
            host: remoteHostOrIp,
            port: remotePort,
        });
        remote.setKeepAlive(true);
        remote.on('error', (err) => {
            debug('got remote connection error', err.message);
            if (err.code === 'ECONNREFUSED') {
                this.emit('error', new Error(`connection refused: ${remoteHostOrIp}:${remotePort} (check your firewall settings)`));
            }
            remote.end();
        });
        const connLocal = () => {
            if (remote.destroyed) {
                debug('remote destroyed');
                this.emit('dead');
                return;
            }
            debug('connecting locally to %s://%s:%d', localProtocol, localHost, localPort);
            remote.pause();
            if (allowInvalidCert) {
                debug('allowing invalid certificates');
            }
            const getLocalCertOpts = () => allowInvalidCert
                ? { rejectUnauthorized: false }
                : {
                    cert: fs_1.default.readFileSync(opt.local_cert),
                    key: fs_1.default.readFileSync(opt.local_key),
                    ca: opt.local_ca ? [fs_1.default.readFileSync(opt.local_ca)] : undefined,
                };
            const local = opt.local_https
                ? tls_1.default.connect({ host: localHost, port: localPort, ...getLocalCertOpts() })
                : net_1.default.connect({ host: localHost, port: localPort });
            const remoteClose = () => {
                debug('remote close');
                this.emit('dead');
                local.end();
            };
            remote.once('close', remoteClose);
            local.once('error', (err) => {
                debug('local error %s', err.message);
                local.end();
                remote.removeListener('close', remoteClose);
                if (err.code !== 'ECONNREFUSED' && err.code !== 'ECONNRESET') {
                    return remote.end();
                }
                setTimeout(connLocal, 1000);
            });
            local.once('connect', () => {
                debug('connected locally');
                remote.resume();
                let stream = remote;
                if (opt.local_host) {
                    debug('transform Host header to %s', opt.local_host);
                    stream = remote.pipe(new HeaderHostTransformer_1.default({ host: opt.local_host }));
                }
                stream.pipe(local).pipe(remote);
                local.once('close', (hadError) => {
                    debug('local connection closed [%s]', hadError);
                });
            });
        };
        remote.on('data', data => {
            const match = data.toString().match(/^(\w+) (\S+)/);
            if (match) {
                this.emit('request', {
                    method: match[1],
                    path: match[2],
                });
            }
        });
        remote.once('connect', () => {
            this.emit('open', remote);
            connLocal();
        });
    }
}
exports.default = TunnelCluster;
