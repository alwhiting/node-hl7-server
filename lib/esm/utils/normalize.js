import { assertNumber, randomString, validIPv4, validIPv6 } from 'node-hl7-client';
import { HL7ListenerError, HL7ServerError } from './exception.js';
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
export function normalizeServerOptions(raw) {
    const props = { ...DEFAULT_SERVER_OPTS, ...raw };
    if (props.ipv4 === true && props.ipv6 === true) {
        throw new HL7ServerError('ipv4 and ipv6 both can\'t be set to be exclusive.');
    }
    if (typeof props.bindAddress !== 'string') {
        throw new HL7ServerError('bindAddress is not valid string.');
    }
    else if (props.bindAddress !== 'localhost') {
        if (typeof props.bindAddress !== 'undefined' && props.ipv6 === true && !validIPv6(props.bindAddress)) {
            throw new HL7ServerError('bindAddress is an invalid ipv6 address.');
        }
        if (typeof props.bindAddress !== 'undefined' && props.ipv4 === true && !validIPv4(props.bindAddress)) {
            throw new HL7ServerError('bindAddress is an invalid ipv4 address.');
        }
    }
    return props;
}
/** @internal */
export function normalizeListenerOptions(raw) {
    const props = { ...DEFAULT_LISTENER_OPTS, ...raw };
    const nameFormat = /[ `!@#$%^&*()+\-=\[\]{};':"\\|,.<>\/?~]/; //eslint-disable-line
    if (typeof props.name === 'undefined') {
        props.name = randomString();
    }
    else {
        if (nameFormat.test(props.name)) {
            throw new HL7ListenerError('name must not contain certain characters: `!@#$%^&*()+\\-=\\[\\]{};\':"\\\\|,.<>\\/?~.');
        }
    }
    if (typeof props.port === 'undefined') {
        throw new HL7ListenerError('port is not defined.');
    }
    if (typeof props.port !== 'number') {
        throw new HL7ListenerError('port is not valid number.');
    }
    assertNumber(props, 'port', 0, 65353);
    return props;
}
