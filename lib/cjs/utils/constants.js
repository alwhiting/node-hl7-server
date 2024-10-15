"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROTOCOL_MLLP_FOOTER = exports.PROTOCOL_MLLP_HEADER = void 0;
/** @internal */
exports.PROTOCOL_MLLP_HEADER = String.fromCharCode(0x0b);
/** @internal */
exports.PROTOCOL_MLLP_FOOTER = `${String.fromCharCode(0x1c)}${String.fromCharCode(0x0d)}`;
