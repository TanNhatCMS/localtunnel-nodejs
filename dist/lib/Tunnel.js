"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const axios_1 = __importDefault(require("axios"));
const debug_1 = __importDefault(require("debug"));
const TunnelCluster_1 = __importDefault(require("./TunnelCluster"));
const debug = (0, debug_1.default)('localtunnel-nodejs:client');
class Tunnel extends events_1.EventEmitter {
    opts;
    closed;
    tunnelCluster;
    clientId;
    url;
    cachedUrl;
    constructor(opts = {}) {
        super();
        this.opts = opts;
        this.closed = false;
        if (!this.opts.host) {
            this.opts.host = 'https://localtunnel.me';
        }
    }
    _getInfo(body) {
        const { id, ip, port, url, cached_url, max_conn_count } = body;
        const { host, port: local_port, local_host, local_https, local_cert, local_key, local_ca, allow_invalid_cert, } = this.opts;
        return {
            name: id,
            url,
            cached_url,
            max_conn: max_conn_count || 1,
            remote_host: new URL(host).hostname,
            remote_ip: ip,
            remote_port: port,
            local_port: local_port || 80,
            local_host,
            local_https,
            local_cert,
            local_key,
            local_ca,
            allow_invalid_cert,
        };
    }
    _init(cb) {
        const opt = this.opts;
        const getInfo = this._getInfo.bind(this);
        const params = {
            responseType: 'json',
        };
        const baseUri = `${opt.host}/`;
        const assignedDomain = opt.subdomain;
        const uri = baseUri + (assignedDomain || '?new');
        const getUrl = () => {
            axios_1.default
                .get(uri, params)
                .then(res => {
                const body = res.data;
                debug('got tunnel information', body);
                if (res.status !== 200) {
                    const err = new Error((body && body.message) || 'localtunnel server returned an error, please try again');
                    return cb(err);
                }
                cb(null, getInfo(body));
            })
                .catch(err => {
                debug(`tunnel server offline: ${err.message}, retry 1s`);
                return setTimeout(getUrl, 1000);
            });
        };
        getUrl();
    }
    _establish(info) {
        this.setMaxListeners(info.max_conn + (events_1.EventEmitter.defaultMaxListeners || 10));
        this.tunnelCluster = new TunnelCluster_1.default(info);
        this.tunnelCluster.once('open', () => {
            this.emit('url', info.url);
        });
        this.tunnelCluster.on('error', (err) => {
            debug('got socket error', err.message);
            this.emit('error', err);
        });
        let tunnelCount = 0;
        this.tunnelCluster.on('open', tunnel => {
            tunnelCount++;
            debug('tunnel open [total: %d]', tunnelCount);
            const closeHandler = () => {
                tunnel.destroy();
            };
            if (this.closed) {
                return closeHandler();
            }
            this.once('close', closeHandler);
            tunnel.once('close', () => {
                this.removeListener('close', closeHandler);
            });
        });
        this.tunnelCluster.on('dead', () => {
            tunnelCount--;
            debug('tunnel dead [total: %d]', tunnelCount);
            if (this.closed)
                return;
            this.tunnelCluster.open();
        });
        this.tunnelCluster.on('request', req => {
            this.emit('request', req);
        });
        for (let count = 0; count < info.max_conn; ++count) {
            this.tunnelCluster.open();
        }
    }
    open(cb) {
        this._init((err, info) => {
            if (err || !info) {
                return cb(err);
            }
            this.clientId = info.name;
            this.url = info.url;
            if (info.cached_url) {
                this.cachedUrl = info.cached_url;
            }
            this._establish(info);
            cb();
        });
    }
    close() {
        this.closed = true;
        this.emit('close');
    }
}
exports.default = Tunnel;
