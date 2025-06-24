import { EventEmitter } from 'events';
import { TunnelClusterOptions } from "./interfaces/TunnelClusterOptions";
export default class TunnelCluster extends EventEmitter {
    private opts;
    constructor(opts?: TunnelClusterOptions);
    open(): void;
}
