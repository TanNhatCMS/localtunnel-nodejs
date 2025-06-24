import Tunnel from './lib/Tunnel';
interface TunnelOptions {
    port: number;
    [key: string]: any;
}
type Callback = (err: Error | null, client?: InstanceType<typeof Tunnel>) => void;
export default function localtunnel(arg1: number | TunnelOptions, arg2?: Callback | Record<string, any>, arg3?: Callback): Promise<InstanceType<typeof Tunnel>> | InstanceType<typeof Tunnel>;
export {};
