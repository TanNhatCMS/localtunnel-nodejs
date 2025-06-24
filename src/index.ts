import Tunnel from './lib/Tunnel';

interface TunnelOptions {
  port: number;
  [key: string]: any;
}

type Callback = (err: Error | null, client?: InstanceType<typeof Tunnel>) => void;

export default function localtunnel(
    arg1: number | TunnelOptions,
    arg2?: Callback | Record<string, any>,
    arg3?: Callback
): Promise<InstanceType<typeof Tunnel>> | InstanceType<typeof Tunnel> {
  const options: TunnelOptions =
      typeof arg1 === 'object' ? arg1 : { ...(arg2 as Record<string, any>), port: arg1 };
  const callback: Callback | undefined = typeof arg1 === 'object' ? (arg2 as Callback) : arg3;

  const client = new Tunnel(options);

  if (callback) {
    client.open((err: Error | null | undefined) => (err ? callback(err) : callback(null, client)));
    return client;
  }

  return new Promise((resolve, reject) => {
    client.open((err?: Error | null) => {
      if (err) return reject(err);
      resolve(client);
    });
  });

}
