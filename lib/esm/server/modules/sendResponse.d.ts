import EventEmitter from 'events';
import { Socket } from 'net';
import { Message } from 'node-hl7-client';
import type { ListenerOptions } from '../../utils/normalize.js';
/**
 * Send Response
 * @since 1.0.0
 */
export declare class SendResponse extends EventEmitter {
    /** @internal */
    private _ack;
    /** @internal */
    private readonly _socket;
    /** @internal */
    private readonly _message;
    /** @internal */
    private readonly _mshOverrides;
    constructor(socket: Socket, message: Message, mshOverrides?: ListenerOptions['mshOverrides']);
    /**
     * Send Response back to End User
     * @since 1.0.0
     * @see {@link https://hl7-definition.caristix.com/v2/HL7v2.1/Tables/0008}
     * @param type
     * @example
     * If you are to confirm to the end user (client) that the message they sent was good and processed successfully.
     * you would send an "AA" style message (Application Accept).
     * Otherwise, send an "AR" (Application Reject) to tell the client the data was
     * not accepted/processed or send an "AE"
     * (Application Error) to tell the client your overall application had an error.
     * ```ts
     * const server = new Server({bindAddress: '0.0.0.0'})
     * const IB_ADT = server.createInbound({port: LISTEN_PORT}, async (req, res) => {
     *  const messageReq = req.getMessage()
     *  await res.sendResponse("AA")
     * })
     *
     * or
     *
     * const server = new Server({bindAddress: '0.0.0.0'})
     * const IB_ADT = server.createInbound({port: LISTEN_PORT}, async (req, res) => {
     *  const messageReq = req.getMessage()
     *  await res.sendResponse("AR")
     * })
     *
     * or
     *
     * const server = new Server({bindAddress: '0.0.0.0'})
     * const IB_ADT = server.createInbound({port: LISTEN_PORT}, async (req, res) => {
     *  const messageReq = req.getMessage()
     *  await res.sendResponse("AE")
     * })
     *```
     *
     * "AE" (Application Error) will be automatically sent if there is a problem creating either an "AA" or "AR"
     * message from the original message sent because the original message structure sent wrong in the first place.
     */
    sendResponse(type: 'AA' | 'AR' | 'AE'): Promise<void>;
    /**
     * Get the Ack Message
     * @since 2.2.0
     * @remarks Get the acknowledged message that was sent to the client.
     * This could return undefined if accessed prior to sending the response
     */
    getAckMessage(): Message | undefined;
    /** @internal */
    private _createAckMessage;
    /** @internal */
    private _createAEAckMessage;
}
