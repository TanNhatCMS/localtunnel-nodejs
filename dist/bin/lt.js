#!/usr/bin/env node
"use strict";
/* eslint-disable no-console */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const openurl_1 = __importDefault(require("openurl"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const index_1 = __importDefault(require("../index"));
const package_json_1 = require("../../package.json");
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .usage('Usage: lt --port [num] <options>')
    .env(true)
    .option('p', {
    alias: 'port',
    type: 'number',
    describe: 'Internal HTTP server port',
    demandOption: true,
})
    .option('h', {
    alias: 'host',
    type: 'string',
    describe: 'Upstream server providing forwarding',
    default: 'https://localtunnel.me',
})
    .option('s', {
    alias: 'subdomain',
    type: 'string',
    describe: 'Request this subdomain',
})
    .option('l', {
    alias: 'local-host',
    type: 'string',
    describe: 'Tunnel traffic to this host instead of localhost, override Host header to this host',
})
    .option('local-https', {
    type: 'boolean',
    describe: 'Tunnel traffic to a local HTTPS server',
})
    .option('local-cert', {
    type: 'string',
    describe: 'Path to certificate PEM file for local HTTPS server',
})
    .option('local-key', {
    type: 'string',
    describe: 'Path to certificate key file for local HTTPS server',
})
    .option('local-ca', {
    type: 'string',
    describe: 'Path to certificate authority file for self-signed certificates',
})
    .option('allow-invalid-cert', {
    type: 'boolean',
    describe: 'Disable certificate checks for your local HTTPS server (ignore cert/key/ca options)',
})
    .option('o', {
    alias: 'open',
    type: 'boolean',
    describe: 'Opens the tunnel URL in your browser',
})
    .option('print-requests', {
    type: 'boolean',
    describe: 'Print basic request info',
})
    .help('help')
    .alias('help', 'h')
    .version(package_json_1.version)
    .parseSync();
if (typeof argv.port !== 'number' || isNaN(argv.port)) {
    console.error('\nInvalid argument: `port` must be a number');
    process.exit(1);
}
(async () => {
    try {
        let tunnel;
        tunnel = await (0, index_1.default)({
            port: argv.port || 8000,
            host: argv.host,
            subdomain: argv.subdomain,
            local_host: argv.localHost,
            local_https: argv.localHttps,
            local_cert: argv.localCert,
            local_key: argv.localKey,
            local_ca: argv.localCa,
            allow_invalid_cert: argv.allowInvalidCert,
        });
        tunnel.on('error', (err) => {
            throw err;
        });
        console.log('your url is: %s', tunnel.url);
        if (tunnel.cachedUrl) {
            console.log('your cachedUrl is: %s', tunnel.cachedUrl);
        }
        if (argv.open) {
            openurl_1.default.open(tunnel.url);
        }
        if (argv['print-requests']) {
            tunnel.on('request', (info) => {
                console.log(new Date().toString(), info.method, info.path);
            });
        }
    }
    catch (err) {
        console.error('Tunnel error:', err.message);
        process.exit(1);
    }
})();
