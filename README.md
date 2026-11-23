# HydroSlice

JavaScript / TypeScript library for parsing meteorological and geospatial data formats — **GRIB2**, **NetCDF3**, **NetCDF4 / HDF5**, **Zarr v2 / v3**, **TIFF / GeoTIFF (including Cloud-Optimized GeoTIFFs)** and **Parquet** — and for exporting results to eight formats (JSON, CSV, GeoTIFF, NetCDF-3, NetCDF-4, Zarr, GRIB2, Parquet) — in the browser, Web Workers, and Node 18+. Powered by a pure-C engine compiled to WebAssembly via Emscripten.

## Install

Until published to npm:

```bash
npm install git+https://github.com/uihilab/SciWrid-Toolkit.git
```

> You do **not** need Python or Emscripten to install, use, or bundle this
> library - the compiled `hydroslice.wasm` ships in the package. Python +
> Emscripten are only needed to *recompile* the WASM from its C sources.

End users do **not** need to install peer compression libraries — `h5wasm` (NetCDF4) and `numcodecs` (Zarr blosc/zstd/lz4) are lazy-loaded from jsdelivr on first use.
The Parquet reader (`hyparquet`) and writer (`hyparquet-writer`) are optional dependencies, imported only when a Parquet file is read or written.

## Supported formats

| Format | Extensions | Notes |
|---|---|---|
| GRIB2 | `.grb2`, `.grib2` | Grid templates 0, 20, 30, 40, 101; simple + complex packing; Section-6 bitmaps (masked points → `NaN`); Lambert and polar stereographic grids keep per-cell lat/lon |
| NetCDF3 Classic | `.nc3` | Full CF coordinate support |
| NetCDF4 / HDF5 | `.nc`, `.nc4`, `.h5` | Loads `h5wasm` from CDN on first use; remote files are read over HTTP Range by object header, and grid reads fetch only the chunks in the window |
| Zarr v2 / v3 | `.zip`, `.zarr`, remote store | Zipped stores are read through the ZIP central directory; remote v2 stores are read chunk by chunk over HTTP. Compressors: `null`, `gzip`, `zlib`, `blosc`, `zstd`, `lz4`. Filters: `shuffle` only (`fixedscaleoffset`, `delta`, … not yet supported). |
| TIFF / GeoTIFF | `.tif`, `.tiff` | UInt8/UInt16/Int16/Float32; LZW + Deflate; horizontal + floating-point predictors; WGS84 / UTM / sinusoidal; strip + tile; **COG over HTTP Range** (scan/extract only read the IFD + needed tile). |
| Parquet | `.parquet` | Point and grid tables (`lat`, `lon`, optional `time`); read over HTTP Range when remote. Needs the optional `hyparquet`. |

## Quick start

```js
import { scan, extract, extractGrid, gridToGeoTIFF, gridToImageData, trim } from 'hydroslice';

// 1. Inspect a file
const meta = await scan(file);          // file: Uint8Array | Blob | File | URL | string
console.log(meta.format, meta.variables.map(v => v.name));

// 1b. Where on Earth the file's grid actually is — use this instead of
//     assuming an extent. [minLon, minLat, maxLon, maxLat] for every format
//     (Leaflet wants lat first: [[bbox[1], bbox[0]], [bbox[3], bbox[2]]]).
//     Optional: absent when the coordinates can't be derived, so check it.
if (meta.bbox) console.log('extent', meta.bbox);

// 2. Point extract
const point = await extract(file, {
  variable: 'TMP', lat: 40.7, lon: -74.0, t1: 0, t2: 0,
});

// 2b. Select a timestep by date instead of index (nearest match):
const atNoon = await extract(file, { variable: 'TMP', date: '2026-04-14T12:00:00Z' });

// 3. Bounding-box grid (parallel workers, abortable, with progress)
const grid = await extractGrid(file, {
  variable: 'TMP',
  bbox:     [-100, 30, -80, 45],   // [minLon, minLat, maxLon, maxLat]
  width:    256, height: 256,
  workers:  5,
  onProgress: ({ done, total }) => console.log(`${done}/${total}`),
});
// grid.data is a Float32Array of length width*height (row 0 = maxLat)

// 4. Save as Float32 WGS84 GeoTIFF
const tiff = gridToGeoTIFF(grid);    // Uint8Array

// 4b. Render it for a web map — Float32 grid → colored RGBA, ready for a
//     <canvas> or a MapLibre ImageSource (zero-dependency, Node + browser)
const img = gridToImageData(grid, { ramp: 'viridis' });   // { width, height, data }
const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
canvas.getContext('2d').putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
const [w, s, e, n] = grid.bbox;   // the grid carries back the bbox it was cut to
map.addSource('data', { type: 'image', url: canvas.toDataURL('image/png'),
  coordinates: [[w, n], [e, n], [e, s], [w, s]] });
map.addLayer({ id: 'data', type: 'raster', source: 'data' });
// Need a PNG instead (server-side, <img> src)? `await gridToPNG(grid, { ramp })`.
// Full drop-a-file MapLibre demo: examples/map-demo.html (npm run demo:web)

// 5. Trim a huge file in-place — keep only what you need, same format out
const trimmed = await trim(file, {
  variables: ['TMP', 'UGRD'],     // names from scan().variable_names
  t1: 0, t2: 23,                  // optional time-axis slice
});
// trimmed.bytes is a Uint8Array of the same format as the input.
// GRIB2 / NetCDF3 / Zarr are byte-cut (no decode); NetCDF4 uses h5wasm.
```

Full API reference: [`docs/API.md`](docs/API.md). TypeScript types ship with the package — no `@types` needed.

## Export formats

Any grid or point series can be written to another format, either straight
from a query or from a result you already hold:

```js
import { extractGridOutput, encodeGrid, encodeSeries, EXPORT_FORMATS } from 'hydroslice';

// One call: query, then encode
const nc = await extractGridOutput(file, { variable: 'TMP', bbox, width: 512, height: 512 }, 'netcdf3');

// Or encode a result you already have
const zarr = await encodeGrid(grid, 'zarr');                    // Uint8Array (.zip)
const csv  = await encodeSeries(point, 'csv');                  // string
const grb  = await encodeGrid(grid, 'grib2', { grib2: { discipline: 0, category: 0, number: 0 } });
```

| Format | Grid | Point / series | Output |
|---|:-:|:-:|---|
| `json` | yes | yes | `string` |
| `csv` | yes | yes | `string` |
| `geotiff` | yes | no | `Uint8Array` (`.tif`) |
| `netcdf3` | yes | yes | `Uint8Array` (`.nc3`), CF-1.8 |
| `netcdf4` | yes | yes | `Uint8Array` (`.nc`), via `h5wasm` |
| `zarr` | yes | yes | `Uint8Array` (Zarr v2 store in a `.zip`) |
| `grib2` | yes | no | `Uint8Array` (`.grb2`), template 3.0, simple packing |
| `parquet` | yes | yes | `Uint8Array` (`.parquet`), needs `hyparquet-writer` |

Build a format chooser from `EXPORT_FORMATS` so it never offers a writer that
cannot represent the result. A format that can't represent it throws
`UnsupportedExportError`, naming the formats that can.

Known limits:
- **GRIB2** has no free-text variable name. Pass the WMO triple (`discipline`, `category`, `number`); without it the parameter is written as missing (255/255). One field per message, so multi-band grids are rejected.
- **NetCDF-4** files open correctly in netCDF-C and xarray, but their dimensions show up as `phony_dim_*`, because h5wasm cannot write `DIMENSION_LIST`. Export `netcdf3` if you need named dimensions.
- **GeoTIFF** and **GRIB2** refuse a point series instead of writing a 1×1 raster.

Details: [`docs/API.md` → `encodeGrid`](docs/API.md#encodegridgrid-format-opts).

## Public exports

All public symbols come from the package root:

```js
import {
  // Functional API (recommended)
  detectFormat, scan, extract, extractOutput,
  extractGrid, extractGridOutput, gridToJSON, gridToGeoTIFF,
  gridToImageData, gridToPNG,        // map rendering: Float32 grid → RGBA / PNG
  RAMPS, resolveRamp, sampleRamp, autoRange, // color ramps (viridis/plasma/grayscale/RdBu)
  encodeGrid, encodeSeries, EXPORT_FORMATS,  // export to json/csv/geotiff/netcdf3/netcdf4/zarr/grib2/parquet
  openChunkMap, decodeChunkBytes,    // HDF5 / NetCDF-4 chunk map, read over ranges
  trim,

  // Class API (advanced — reuse one instance across many extracts)
  HydroSlice,

  // Typed errors (all extend HydroSliceError)
  HydroSliceError, UnsupportedFormatError, VariableNotFoundError,
  SourceError, ExtractError, TrimError, UnsupportedCRSError,
  UnsupportedExportError,
} from 'hydroslice';
```

Anything inside `wasm/` is internal and may change without notice.

## Project layout

```
hydroslice/
├── index.js            ← public entry point
├── index.d.ts          ← TypeScript types
├── lib/                ← JavaScript library source (internal — do not import directly)
│   ├── hydroslice-lib.js   class implementation
│   ├── hydroslice-api.js   functional API
│   ├── hydroslice-api.d.ts TypeScript types
│   ├── errors.js           typed error classes
│   ├── grid-output.js      GeoTIFF / JSON serialisers
│   ├── encode/             export writers (netcdf3/4, zarr, grib2, parquet, csv, json, geotiff)
│   ├── grib2/              GRIB2 index + HTTP Range reader
│   ├── hdf5/               HDF5 / NetCDF-4 range reader + chunk map
│   ├── netcdf/             CF grid-mapping (projected CRS) helpers
│   ├── parquet/            Parquet reader
│   ├── sources/            HTTP Range fetcher, chunk cache, remote reference store
│   ├── render/             color ramps + Float32 grid → RGBA / PNG
│   ├── trim/               in-place file trimming (per-format)
│   ├── tiff/               TIFF / GeoTIFF reader (+ COG over HTTP Range)
│   ├── zarr/               Zarr v2 / v3 reader (zip, remote store, compressors, filters)
│   ├── kerchunk/           Kerchunk / reference-store reader
│   ├── time-decoder.js     CF time-axis decoding
│   └── time-select.js      date → nearest timestep selection
├── wasm/               ← WASM artifacts + C build (internal)
│   ├── hydroslice.wasm     compiled C core (~330 KB)
│   ├── hydroslice.js       Emscripten loader
│   ├── wasm_api.c          C bindings
│   └── build.py            build script
├── worker/             ← Web Worker for parallel bbox extraction
├── examples/           ← api-demo.html, map-demo.html, library-usage.html, testfile/
├── scripts/            ← build, dev server, fixture and table generators
├── docs/               ← API.md
│
│   ── native C side (compiled to WASM; not shipped in the npm package) ──
├── core/               ← C engine: dispatch, cursor, query, errors, geo math
├── formats/            ← per-format C readers (grib2, hdf5, netcdf, raw)
├── helper/             ← GRIB2 conversion helpers
└── tools/              ← native offline CLIs (normalize_refs, query) + Makefile
```

## Run the demos

```bash
npm run demo:web        # serves examples/ on localhost (api-demo, map-demo, library-usage)
npm run demo:grib2      # CLI: scan + extract a sample GRIB2 file
npm run demo:netcdf3    # CLI: scan + extract a sample NetCDF3 file
npm run demo:netcdf4    # CLI: scan + extract a sample NetCDF4 file
npm run demo:zarr       # CLI: scan + extract a sample Zarr file
```

CLI demo scripts live under `examples/testfile/`.
Use `npm run build:zarr-fixture` to regenerate the rich deflated Zarr fixture
at `examples/testfile/sample-zarr-rich.zarr.zip`.

Tests (the runners and fixtures live in `.testkit/` and `examples/testfile/`, which are not committed):

```bash
npm test                # the whole suite
npm run test:api        # functional API
npm run test:grid       # extractGrid (parallel bbox)
npm run test:zarr       # Zarr path
npm run test:tiff       # TIFF / GeoTIFF
npm run test:tiff-range # COG over HTTP Range
npm run test:trim       # trim() across all formats
npm run test:time       # CF time-axis decoding
npm run test:time-select# date → nearest-timestep selection
npm run test:render     # color ramps + gridToImageData / gridToPNG
npm run test:kerchunk   # Kerchunk reference store
npm run test:encode     # export registry; also test:encode-nc3 / -nc4 / -zarr / -grib2 / -parquet
npm run test:parquet    # Parquet reader
```

The `demo:web` server hosts several pages:
- **`api-demo.html`** — drop a `.grb2` / `.nc` / `.zip`/`.zarr` / `.tif` file and run `scan` / `extract` / `extractGrid` interactively (heat-map canvas, progress, abort, GeoTIFF / JSON download).
- **`map-demo.html`** — drop a file and render it on a MapLibre map (date coverage in the sidebar).
- **`library-usage.html`** — minimal copy-paste usage example.

## Current state

### ✅ Working
- **GRIB2** — grid templates 0, 20, 30, 40, 101; simple + complex packing; Section-6 bitmaps (masked points → `NaN`); **parameter names + units from WMO Code Table 4.2**, including the centre-local ranges NCEP, ECMWF, DWD, Rome and Helsinki define. Lambert conformal (NAM, HRRR) and polar stereographic (Stage IV) grids are curvilinear: every cell keeps its own lat/lon, and values, coordinates and masks match ecCodes.
- **NetCDF3 Classic** — full CF coordinate support.
- **NetCDF4 / HDF5** — via lazy-loaded `h5wasm`; large remote files are read over HTTP Range by object header, grid reads fetch only the chunks they need, and `openChunkMap` exposes the chunk layout.
- **Zarr v2 / v3** — compressors `null`, `gzip`, `zlib`, `blosc`, `zstd`, `lz4`; zipped stores read through the central directory; remote v2 stores read chunk by chunk.
- **TIFF / GeoTIFF** — UInt8/16, Int16, Float32; LZW + Deflate; horizontal + floating-point predictors, read and written the way libtiff does; WGS84 / UTM / sinusoidal; strip + tile; **COG over HTTP Range**.
- **Parquet** — point and grid tables, read over HTTP Range when remote.
- **Point + bbox extraction** — `extract`, `extractGrid` (parallel workers, abortable, progress).
- **Geographic extent** — `scan()` reports `meta.bbox` for GRIB2, NetCDF3, NetCDF4/HDF5, Zarr, Parquet and TIFF, so a map can place the grid without guessing. Projected grids (polar stereographic, Lambert) report the envelope of their real lat/lon, not a four-corner box.
- **CF time axis** — decode timesteps; select a timestep by `date` (nearest match); `timeRange` / per-axis start–end exposed by `scan`.
- **Output** — `gridToGeoTIFF`, `gridToJSON`, `gridToImageData` / `gridToPNG` (viridis / plasma / grayscale / RdBu ramps).
- **Export** — `encodeGrid` / `encodeSeries` / `extractGridOutput` to JSON, CSV, GeoTIFF, NetCDF-3, NetCDF-4, Zarr v2, GRIB2 and Parquet (see [Export formats](#export-formats)).
- **`trim()`** — in-place file trimming across GRIB2 / NetCDF3 / NetCDF4 / Zarr.

### ⚠️ Not yet supported
- Zarr filters (`fixedscaleoffset`, `delta`, …).
- Zarr v3 — reads fine, but `trim()` refuses it.
- `meta.bbox` for GRIB2 grid templates outside 0 / 20 / 30 / 40.
- GRIB2 interval products: only template 4.8 is stamped at the interval end; 4.9–4.14 still report the reference time.
- `trim()` on Parquet.
- NetCDF-4 export with named dimensions (they appear as `phony_dim_*`; use `netcdf3`).
- GRIB2 export of anything but a single-field regular lat/lon grid (template 3.0).

## Roadmap

### Sprint 7 — `api-demo` UX + large-file testing
1. **Improve the `api-demo` UX** so users can comfortably test the library end-to-end — clearer scan/extract flows, better feedback, and easier inspection of results.
2. **Heavy testing on large files** — exercise the existing pipeline (streaming scan, COG HTTP Range reads, parallel `extractGrid`, `trim`) against big real-world inputs to validate performance and memory behavior.

## Building

The library ships a **prebuilt `hydroslice.wasm`** in the repo, so neither end
users nor most contributors need Python or Emscripten.

There are two independent stages:

| Command | What it does | When you need it | Requires |
|---|---|---|---|
| `npm run build` | Bundles the JS and copies the prebuilt `.wasm` into `dist/` (the publishable package). | Every time you publish to npm. | Node 18+ only |
| `npm run build:wasm` | Recompiles the C sources to `hydroslice.wasm`. | Only when you change the C in `formats/` or `wasm/`. | Emscripten (`emcc`) on `PATH` |

```bash
# Package for npm (pure Node - no Python, no Emscripten):
npm run build        # writes dist/

# Recompile the WASM (only when C sources changed):
npm run build:wasm   # writes wasm/hydroslice.wasm (commit the result)
```

The repo is kept **un-built**: `dist/` is gitignored and regenerated by
`npm run build` (which also runs automatically on `npm publish`).

## Acknowledgements

Developed by the Tulane University Hydroinformatics Lab (HILAB): https://hydroinformatics.tulane.edu

## License

MIT.
