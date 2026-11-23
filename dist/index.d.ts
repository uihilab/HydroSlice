/**
 * Type definitions for the HydroSlice library.
 */

// Re-export all types and function signatures from the internal API module.
export type {
  Format,
  Source,
  CommonOptions,
  VariableInfo,
  ScanResult,
  CFTimes,
  ExtractOptions,
  ExtractResult,
  TimeseriesPoint,
  OutputFormat,
  ExportFormat,
  ChunkRef,
  ChunkMeta,
  ChunkMap,
  Grib2Parameter,
  BBox,
  ExtractGridOptions,
  ExtractGridResult,
  ExtractGridProgress,
  DateInput,
  GridOutputFormat,
  RGB,
  RGBA,
  RampStop,
  Ramp,
  RampName,
  RenderOptions,
  GridImageData,
  TrimOptions,
  TrimResult,
} from './hydroslice-api.js';

export {
  encodeGrid,
  encodeSeries,
  EXPORT_FORMATS,
  UnsupportedExportError,
  openChunkMap,
  decodeChunkBytes,
  scan,
  extract,
  extractOutput,
  extractGrid,
  extractGridOutput,
  gridToJSON,
  gridToGeoTIFF,
  gridToImageData,
  gridToPNG,
  RAMPS,
  resolveRamp,
  sampleRamp,
  detectFormat,
  trim,
  HydroSliceError,
  UnsupportedFormatError,
  VariableNotFoundError,
  SourceError,
  ExtractError,
  TrimError,
  UnsupportedCRSError,
} from './hydroslice-api.js';

// Low-level class API
export { HydroSlice } from './hydroslice-lib.js';

import type { default as _default } from './hydroslice-lib.js';
export default _default;
