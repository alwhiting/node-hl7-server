"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeServerOptions = normalizeServerOptions;
exports.normalizeListenerOptions = normalizeListenerOptions;
const node_hl7_client_1 = require("node-hl7-client");
const exception_js_1 = require("./exception.js");
const DEFAULT_SERVER_OPTS = {
    bindAddress: '0.0.0.0',
    encoding: 'utf-8',
    ipv4: true,
    ipv6: false
};
const DEFAULT_LISTENER_OPTS = {
    encoding: 'utf-8'
};
/** @internal */
function normalizeServerOptions(raw) {
    const props = { ...DEFAULT_SERVER_OPTS, ...raw };
    if (props.ipv4 === true && props.ipv6 === true) {
        throw new exception_js_1.HL7ServerError('ipv4 and ipv6 both can\'t be set to be exclusive.');
    }
    if (typeof props.bindAddress !== 'string') {
        throw new exception_js_1.HL7ServerError('bindAddress is not valid string.');
    }
    else if (props.bindAddress !== 'localhost') {
        if (typeof props.bindAddress !== 'undefined' && props.ipv6 === true && !(0, node_hl7_client_1.validIPv6)(props.bindAddress)) {
            throw new exception_js_1.HL7ServerError('bindAddress is an invalid ipv6 address.');
        }
        if (typeof props.bindAddress !== 'undefined' && props.ipv4 === true && !(0, node_hl7_client_1.validIPv4)(props.bindAddress)) {
            throw new exception_js_1.HL7ServerError('bindAddress is an invalid ipv4 address.');
        }
    }
    return props;
}
/** @internal */
function normalizeListenerOptions(raw) {
    const props = { ...DEFAULT_LISTENER_OPTS, ...raw };
    const nameFormat = /[ `!@#$%^&*()+\-=\[\]{};':"\\|,.<>\/?~]/; //eslint-disable-line
    if (typeof props.name === 'undefined') {
        props.name = (0, node_hl7_client_1.randomString)();
    }
    else {
        if (nameFormat.test(props.name)) {
            throw new exception_js_1.HL7ListenerError('name must not contain certain characters: `!@#$%^&*()+\\-=\\[\\]{};\':"\\\\|,.<>\\/?~.');
        }
    }
    if (typeof props.port === 'undefined') {
        throw new exception_js_1.HL7ListenerError('port is not defined.');
    }
    if (typeof props.port !== 'number') {
        throw new exception_js_1.HL7ListenerError('port is not valid number.');
    }
    (0, node_hl7_client_1.assertNumber)(props, 'port', 0, 65353);
    return props;
}
