import { parse } from 'url';
import { EventEmitter } from 'events';
import axios from 'axios';
import debugLib from 'debug';
import TunnelCluster from './TunnelCluster';
import {TunnelClusterOptions} from "./interfaces/TunnelClusterOptions";

const debug = debugLib('localtunnel-nodejs:client');

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
  private opts: TunnelOptions;
  private closed: boolean;
  private tunnelCluster?: TunnelCluster;
  public clientId?: string;
  public url?: string;
  public cachedUrl?: string;

  constructor(opts: TunnelOptions = {}) {
    super();
    this.opts = opts;
    this.closed = false;
    if (!this.opts.host) {
      this.opts.host = 'https://localtunnel.me';
    }
  }

  private _getInfo(body: any): TunnelClusterOptions {
    const { id, ip, port, url, cached_url, max_conn_count } = body;
    const {
      host,
      port: local_port,
      local_host,
      local_https,
      local_cert,
      local_key,
      local_ca,
      allow_invalid_cert,
    } = this.opts;

    return {
      name: id,
      url,
      cached_url,
      max_conn: max_conn_count || 1,
      remote_host: new URL(host!).hostname,
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

  private _init(cb: (err: Error | null, info?: TunnelClusterOptions) => void): void {
    const opt = this.opts;
    const getInfo = this._getInfo.bind(this);

    const params = {
      responseType: 'json' as const,
    };

    const baseUri = `${opt.host}/`;
    const assignedDomain = opt.subdomain;
    const uri = baseUri + (assignedDomain || '?new');

    const getUrl = () => {
      axios
          .get(uri, params)
          .then(res => {
            const body = res.data;
            debug('got tunnel information', body);
            if (res.status !== 200) {
              const err = new Error(
                  (body && body.message) || 'localtunnel server returned an error, please try again'
              );
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

  private _establish(info: TunnelClusterOptions): void {
    this.setMaxListeners(info.max_conn + (EventEmitter.defaultMaxListeners || 10));
    this.tunnelCluster = new TunnelCluster(info);

    this.tunnelCluster.once('open', () => {
      this.emit('url', info.url);
    });

    this.tunnelCluster.on('error', (err: Error) => {
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
      if (this.closed) return;
      this.tunnelCluster!.open();
    });

    this.tunnelCluster.on('request', req => {
      this.emit('request', req);
    });

    for (let count = 0; count < info.max_conn; ++count) {
      this.tunnelCluster.open();
    }
  }

  public open(cb: OpenCallback): void {
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

  public close(): void {
    this.closed = true;
    this.emit('close');
  }
}
