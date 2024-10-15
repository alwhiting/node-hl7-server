"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inbound = void 0;
const events_1 = __importDefault(require("events"));
const net_1 = __importDefault(require("net"));
const tls_1 = __importDefault(require("tls"));
const node_hl7_client_1 = require("node-hl7-client");
const constants_js_1 = require("../utils/constants.js");
const normalize_js_1 = require("../utils/normalize.js");
const inboundRequest_js_1 = require("./modules/inboundRequest.js");
const sendResponse_js_1 = require("./modules/sendResponse.js");
/* eslint-enable */
/**
 * Inbound Listener Class
 * @since 1.0.0
 */
class Inbound extends events_1.default {
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
        this._opt = (0, normalize_js_1.normalizeListenerOptions)(props);
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
            socket = tls_1.default.createServer({ key, cert, requestCert, ca }, socket => this._onTcpClientConnected(socket));
        }
        else {
            socket = net_1.default.createServer(socket => this._onTcpClientConnected(socket));
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
                loadedMessage += buffer.toString().replace(constants_js_1.PROTOCOL_MLLP_HEADER, '');
                // is there is F5 and CR in this message?
                if (loadedMessage.includes(constants_js_1.PROTOCOL_MLLP_FOOTER)) {
                    // strip them out
                    loadedMessage = loadedMessage.replace(constants_js_1.PROTOCOL_MLLP_FOOTER, '');
                    // copy completed message to continue processing and clear the buffer
                    const completedMessageCopy = JSON.parse(JSON.stringify(loadedMessage));
                    loadedMessage = '';
                    // parser either is batch or a message
                    let parser;
                    // send raw information to the emit
                    this.emit('data.raw', completedMessageCopy);
                    if ((0, node_hl7_client_1.isFile)(completedMessageCopy)) {
                        // parser the batch
                        parser = new node_hl7_client_1.FileBatch({ text: completedMessageCopy });
                        // load the messages
                        const allMessage = parser.messages();
                        allMessage.forEach((message) => {
                            // parse this message
                            const messageParsed = new node_hl7_client_1.Message({ text: message.toString() });
                            // increase the total message
                            ++this.stats.totalMessage;
                            // create the inbound request
                            const req = new inboundRequest_js_1.InboundRequest(messageParsed, { type: 'file' });
                            // create the send response function
                            const res = new sendResponse_js_1.SendResponse(socket, message, this._opt.mshOverrides);
                            // on a response sent, tell the inbound listener
                            res.on('response.sent', () => {
                                this.emit('response.sent');
                            });
                            void this._handler(req, res);
                        });
                    }
                    else if ((0, node_hl7_client_1.isBatch)(completedMessageCopy)) {
                        // parser the batch
                        parser = new node_hl7_client_1.Batch({ text: completedMessageCopy });
                        // load the messages
                        const allMessage = parser.messages();
                        // loop messages
                        allMessage.forEach((message) => {
                            // parse this message
                            const messageParsed = new node_hl7_client_1.Message({ text: message.toString() });
                            // increase the total message
                            ++this.stats.totalMessage;
                            // create the inbound request
                            const req = new inboundRequest_js_1.InboundRequest(messageParsed, { type: 'file' });
                            // create the send response function
                            const res = new sendResponse_js_1.SendResponse(socket, messageParsed, this._opt.mshOverrides);
                            // on a response sent, tell the inbound listener
                            void this._handler(req, res);
                        });
                    }
                    else {
                        // parse this message
                        const messageParsed = new node_hl7_client_1.Message({ text: completedMessageCopy });
                        // increase the total message
                        ++this.stats.totalMessage;
                        // create the inbound request
                        const req = new inboundRequest_js_1.InboundRequest(messageParsed, { type: 'file' });
                        // create the send response function
                        const res = new sendResponse_js_1.SendResponse(socket, messageParsed, this._opt.mshOverrides);
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
exports.Inbound = Inbound;
