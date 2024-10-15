import { TcpSocketConnectOpts } from 'node:net';
import type { ConnectionOptions as TLSOptions } from 'node:tls';
/**
 * @since 1.0.0
 */
export interface ServerOptions {
    /** The network address to listen on expediently.
     * @default 0.0.0.0 */
    bindAddress?: string;
    /** IPv4 Only - If this is set to true, only IPv4 address will be used.
     * @default false */
    ipv4?: boolean;
    /** IPv6 Only - If this is set to true, only IPv6 address will be used.
     * @default false */
    ipv6?: boolean;
    /** Additional options when creating the TCP socket with net.connect(). */
    socket?: TcpSocketConnectOpts;
    /** Enable TLS, or set TLS specific options like overriding the CA for
     * self-signed certificates. */
    tls?: TLSOptions;
}
/**
 * @since 1.0.0
 */
export interface ListenerOptions {
    /** Optional MSH segment overrides
     * syntax: "field path as numbers separated by dots": "field value"
     * e.g. { '9.3': 'ACK' } → MSH field 9.3 set to "ACK"
     * @since 2.5.0 */
    mshOverrides?: Record<string, string>;
    /** Name of the Listener (e.g., IB_EPIC_ADT)
     * @default Randomized String */
    name?: string;
    /** The network address to listen on expediently.
     * Must be set between 0 and 65353 */
    port: number;
    /** Encoding of the messages we expect from the HL7 message.
     * @default "utf-8"
     */
    encoding?: BufferEncoding;
}
/**
 * @since 1.0.0
 */
type ValidatedKeys = 'name' | 'port' | 'encoding';
/**
 * @since 1.0.0
 */
interface ValidatedOptions extends Pick<Required<ListenerOptions>, ValidatedKeys> {
    mshOverrides?: Record<string, string>;
    name: string;
    port: number;
}
/** @internal */
export declare function normalizeServerOptions(raw?: ServerOptions): ServerOptions;
/** @internal */
export declare function normalizeListenerOptions(raw?: ListenerOptions): ValidatedOptions;
export {};
