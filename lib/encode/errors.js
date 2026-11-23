import { HydroSliceError } from '../errors.js';

/* Thrown when a format cannot represent what it was handed: an unknown format
 * id, a (format, kind) pair the registry marks unsupported, or a result shape
 * outside the encoder layer's scope. The message always names what to use
 * instead, because "unsupported" without an alternative is not an answer. */
export class UnsupportedExportError extends HydroSliceError {
  constructor(message) { super(message); this.name = 'UnsupportedExportError'; }
}
