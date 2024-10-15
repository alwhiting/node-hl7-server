import EventEmitter from 'events';
import net from 'net';
import tls from 'tls';
import { FileBatch, Batch, Message, isBatch, isFile } from 'node-hl7-client';
import { PROTOCOL_MLLP_FOOTER, PROTOCOL_MLLP_HEADER } from '../utils/constants.js';
import { normalizeListenerOptions } from '../utils/normalize.js';
import { InboundRequest } from './modules/inboundRequest.js';
import { SendResponse } from './modules/sendResponse.js';
/* eslint-enable */
/**
 * Inbound Listener Class
 * @since 1.0.0
 */
export class Inbound extends EventEmitter {
    /**
     * Build a Listener
     * @since 1.0.0
     * @param server
     * @param props
     * @param handler
     */
    constructor(server, props, handler) {
        super();
        /** @internal */
        this.stats = {
            /** Total message received to server.
             * @since 2.0.0 */
            received: 0,
            /** Total message parsed by the server..
             * @since 2.0.0 */
            totalMessage: 0
        };
        this._handler = handler;
        this._main = server;
        this._opt = normalizeListenerOptions(props);
        this._sockets = [];
        this._listen = this._listen.bind(this);
        this._onTcpClientConnected = this._onTcpClientConnected.bind(this);
        this._socket = this._listen();
    }
    /** Close Listener Instance.
     * This be called for each listener, but if the server instance is closed and shut down, this will also fire off.
     * @since 1.0.0 */
    async close() {
        this._sockets.forEach((socket) => {
            socket.destroy();
        });
        this._socket?.close(() => {
            this._socket?.unref();
        });
        return true;
    }
    /** @internal */
    _listen() {
        let socket;
        const port = this._opt.port;
        const bindAddress = this._main._opt.bindAddress;
        const ipv6 = this._main._opt.ipv6;
        if (typeof this._main._opt.tls !== 'undefined') {
            const { key, cert, requestCert, ca } = this._main._opt.tls;
            socket = tls.createServer({ key, cert, requestCert, ca }, socket => this._onTcpClientConnected(socket));
        }
        else {
            socket = net.createServer(socket => this._onTcpClientConnected(socket));
        }
        socket.on('error', err => {
            this.emit('error', err);
        });
        socket.listen({ port, ipv6Only: ipv6, hostname: bindAddress }, () => {
            this.emit('listen');
        });
        return socket;
    }
    /** @internal */
    _onTcpClientConnected(socket) {
        // set message
        let loadedMessage = '';
        // add socked connection to array
        this._sockets.push(socket);
        // no delay in processing the message
        socket.setNoDelay(true);
        // set encoding
        socket.setEncoding(this._opt.encoding);
        socket.on('data', (buffer) => {
            socket.cork();
            // we got a message, we don't care if it's good or not
            ++this.stats.received;
            try {
                // set message
                loadedMessage += buffer.toString().replace(PROTOCOL_MLLP_HEADER, '');
                // is there is F5 and CR in this message?
                if (loadedMessage.includes(PROTOCOL_MLLP_FOOTER)) {
                    // strip them out
                    loadedMessage = loadedMessage.replace(PROTOCOL_MLLP_FOOTER, '');
                    // copy completed message to continue processing and clear the buffer
                    const completedMessageCopy = JSON.parse(JSON.stringify(loadedMessage));
                    loadedMessage = '';
                    // parser either is batch or a message
                    let parser;
                    // send raw information to the emit
                    this.emit('data.raw', completedMessageCopy);
                    if (isFile(completedMessageCopy)) {
                        // parser the batch
                        parser = new FileBatch({ text: completedMessageCopy });
                        // load the messages
                        const allMessage = parser.messages();
                        allMessage.forEach((message) => {
                            // parse this message
                            const messageParsed = new Message({ text: message.toString() });
                            // increase the total message
                            ++this.stats.totalMessage;
                            // create the inbound request
                            const req = new InboundRequest(messageParsed, { type: 'file' });
                            // create the send response function
                            const res = new SendResponse(socket, message, this._opt.mshOverrides);
                            // on a response sent, tell the inbound listener
                            res.on('response.sent', () => {
                                this.emit('response.sent');
                            });
                            void this._handler(req, res);
                        });
                    }
                    else if (isBatch(completedMessageCopy)) {
                        // parser the batch
                        parser = new Batch({ text: completedMessageCopy });
                        // load the messages
                        const allMessage = parser.messages();
                        // loop messages
                        allMessage.forEach((message) => {
                            // parse this message
                            const messageParsed = new Message({ text: message.toString() });
                            // increase the total message
                            ++this.stats.totalMessage;
                            // create the inbound request
                            const req = new InboundRequest(messageParsed, { type: 'file' });
                            // create the send response function
                            const res = new SendResponse(socket, messageParsed, this._opt.mshOverrides);
                            // on a response sent, tell the inbound listener
                            void this._handler(req, res);
                        });
                    }
                    else {
                        // parse this message
                        const messageParsed = new Message({ text: completedMessageCopy });
                        // increase the total message
                        ++this.stats.totalMessage;
                        // create the inbound request
                        const req = new InboundRequest(messageParsed, { type: 'file' });
                        // create the send response function
                        const res = new SendResponse(socket, messageParsed, this._opt.mshOverrides);
                        // on a response sent, tell the inbound listener
                        void this._handler(req, res);
                    }
                }
            }
            catch (err) {
                this.emit('data.error', err);
            }
            socket.uncork();
        });
        socket.on('error', err => {
            this.emit('client.error', err);
            this._closeSocket(socket);
        });
        socket.on('close', hadError => {
            this.emit('client.close', hadError);
            this._closeSocket(socket);
        });
        this.emit('client.connect', socket);
    }
    /** @internal */
    _closeSocket(socket) {
        socket.destroy();
        this._sockets.splice(this._sockets.indexOf(socket), 1);
    }
}
