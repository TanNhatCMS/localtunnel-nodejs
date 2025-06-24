"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = localtunnel;
const Tunnel_1 = __importDefault(require("./lib/Tunnel"));
function localtunnel(arg1, arg2, arg3) {
    const options = typeof arg1 === 'object' ? arg1 : { ...arg2, port: arg1 };
    const callback = typeof arg1 === 'object' ? arg2 : arg3;
    const client = new Tunnel_1.default(options);
    if (callback) {
        client.open((err) => (err ? callback(err) : callback(null, client)));
        return client;
    }
    return new Promise((resolve, reject) => {
        client.open((err) => {
            if (err)
                return reject(err);
            resolve(client);
        });
    });
}
