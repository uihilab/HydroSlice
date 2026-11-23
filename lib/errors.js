/*
 * lib/errors.js
 *
 * Base typed errors for the HydroSlice package. Lives in its own module
 * (no further imports) so submodules can extend HydroSliceError without
 * creating circular imports through hydroslice-api.js.
 */

export class HydroSliceError extends Error {
  constructor(message) { super(message); this.name = 'HydroSliceError'; }
}
export class UnsupportedFormatError extends HydroSliceError {
  constructor(message) { super(message); this.name = 'UnsupportedFormatError'; }
}
export class VariableNotFoundError extends HydroSliceError {
  constructor(message) { super(message); this.name = 'VariableNotFoundError'; }
}
export class SourceError extends HydroSliceError {
  constructor(message) { super(message); this.name = 'SourceError'; }
}
export class ExtractError extends HydroSliceError {
  constructor(message) { super(message); this.name = 'ExtractError'; }
}
