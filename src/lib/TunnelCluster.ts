import { EventEmitter } from 'events';
import debugLib from 'debug';
import fs from 'fs';
import net from 'net';
import tls from 'tls';
import HeaderHostTransformer from './HeaderHostTransformer';
import {TunnelClusterOptions} from "./interfaces/TunnelClusterOptions";

const debug = debugLib('localtunnel:client');



export default class TunnelCluster extends EventEmitter {
  private opts: TunnelClusterOptions;

  constructor(opts: TunnelClusterOptions = {} as TunnelClusterOptions) {
    super();
    this.opts = opts;
  }

  open(): void {
    const opt = this.opts;

    const remoteHostOrIp = opt.remote_ip || opt.remote_host;
    const remotePort = opt.remote_port;
    const localHost = opt.local_host || 'localhost';
    const localPort = opt.local_port;
    const localProtocol = opt.local_https ? 'https' : 'http';
    const allowInvalidCert = opt.allow_invalid_cert;

    debug(
        'establishing tunnel %s://%s:%s <> %s:%s',
        localProtocol,
        localHost,
        localPort,
        remoteHostOrIp,
        remotePort
    );

    const remote = net.connect({
      host: remoteHostOrIp,
      port: remotePort,
    });

    remote.setKeepAlive(true);

    remote.on('error', (err: NodeJS.ErrnoException) => {
      debug('got remote connection error', err.message);

      if (err.code === 'ECONNREFUSED') {
        this.emit(
            'error',
            new Error(`connection refused: ${remoteHostOrIp}:${remotePort} (check your firewall settings)`)
        );
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

      const getLocalCertOpts = (): tls.ConnectionOptions =>
          allowInvalidCert
              ? { rejectUnauthorized: false }
              : {
                cert: fs.readFileSync(opt.local_cert!),
                key: fs.readFileSync(opt.local_key!),
                ca: opt.local_ca ? [fs.readFileSync(opt.local_ca)] : undefined,
              };

      const local = opt.local_https
          ? tls.connect({ host: localHost, port: localPort, ...getLocalCertOpts() })
          : net.connect({ host: localHost, port: localPort });

      const remoteClose = () => {
        debug('remote close');
        this.emit('dead');
        local.end();
      };

      remote.once('close', remoteClose);

      local.once('error', (err: NodeJS.ErrnoException) => {
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

        let stream: net.Socket | HeaderHostTransformer = remote;

        if (opt.local_host) {
          debug('transform Host header to %s', opt.local_host);
          stream = remote.pipe(new HeaderHostTransformer({ host: opt.local_host }));
        }

        stream.pipe(local).pipe(remote);

        local.once('close', (hadError: boolean) => {
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
