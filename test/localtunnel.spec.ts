/// <reference types="mocha" />
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import assert from 'assert';
import { URL } from 'url';
import localtunnel from "../src";

let fakePort: number;

before((done: () => void) => {
    const server = http.createServer((req, res) => {
        res.write(req.headers.host || '');
        res.end();
    });
    server.listen(() => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
            fakePort = addr.port;
        }
        done();
    });
});

it('query localtunnel server w/ ident', async () => {
    const tunnel = await localtunnel({ port: fakePort });
    assert.ok(/^https:\/\/.*localtunnel.me$/.test(tunnel.url!));

    const parsed = new URL(tunnel.url!);

    const opt: https.RequestOptions = {
        host: parsed.hostname,
        port: 443,
        path: '/',
        headers: { host: parsed.hostname },
    };

    const resBody = await httpsRequest(opt);
    assert(/.*[.]localtunnel[.]me/.test(resBody), resBody);

    tunnel.close();
});

it('request specific domain', async () => {
    const subdomain = Math.random().toString(36).substring(2);
    const tunnel = await localtunnel({ port: fakePort, subdomain });
    assert.ok(new RegExp(`^https://${subdomain}.localtunnel.me$`).test(tunnel.url!));
    tunnel.close();
});

describe('--local-host localhost', () => {
    it('override Host header with local-host', async () => {
        const tunnel = await localtunnel({ port: fakePort, local_host: 'localhost' });
        const parsed = new URL(tunnel.url!);

        const opt: https.RequestOptions = {
            host: parsed.hostname,
            port: 443,
            path: '/',
            headers: { host: parsed.hostname },
        };

        const resBody = await httpsRequest(opt);
        assert.strictEqual(resBody, 'localhost');

        tunnel.close();
    });
});

describe('--local-host 127.0.0.1', () => {
    it('override Host header with local-host', async () => {
        const tunnel = await localtunnel({ port: fakePort, local_host: '127.0.0.1' });
        const parsed = new URL(tunnel.url!);

        const opt: https.RequestOptions = {
            host: parsed.hostname,
            port: 443,
            path: '/',
            headers: { host: parsed.hostname },
        };

        const resBody = await httpsRequest(opt);
        assert.strictEqual(resBody, '127.0.0.1');

        tunnel.close();
    });

    it('send chunked request', async () => {
        const tunnel = await localtunnel({ port: fakePort, local_host: '127.0.0.1' });
        const parsed = new URL(tunnel.url!);

        const opt: https.RequestOptions = {
            host: parsed.hostname,
            port: 443,
            path: '/',
            headers: {
                host: parsed.hostname,
                'Transfer-Encoding': 'chunked',
            },
        };

        const randomBody = crypto.randomBytes(1024 * 8).toString('base64');
        const resBody = await httpsRequest(opt, randomBody);
        assert.strictEqual(resBody, '127.0.0.1');

        tunnel.close();
    });
});

// Utility: promisified https request
function httpsRequest(options: https.RequestOptions, body?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', chunk => (data += chunk));
            res.on('end', () => resolve(data));
        });

        req.on('error', reject);

        if (body) req.end(body);
        else req.end();
    });
}
