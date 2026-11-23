/*
 * lib/trim/errors.js
 *
 * Typed error for the trim pipeline. Extends HydroSliceError so callers
 * can `instanceof HydroSliceError`-check at the package boundary.
 */
import { HydroSliceError } from '../errors.js';

export class TrimError extends HydroSliceError {
  constructor(message) { super(message); this.name = 'TrimError'; }
}
