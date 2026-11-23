import subprocess, sys, os, shutil

os.chdir(os.path.dirname(os.path.abspath(__file__)))

# $EMCC, then emcc on PATH (Homebrew, emsdk_env), then the original Windows emsdk.
EMCC = (os.environ.get("EMCC") or shutil.which("emcc")
        or r"C:\Users\Khoa Le\Downloads\emsdk-main\emsdk-main\upstream\emscripten\emcc.py")

cmd = [
    *([sys.executable, EMCC] if EMCC.endswith(".py") else [EMCC]),
    "-O2", "-std=c99", "-I..",
    "-sEXPORTED_RUNTIME_METHODS=['ccall','cwrap','UTF8ToString','stringToUTF8','lengthBytesUTF8','HEAPF32','HEAPF64','HEAPU8']",
    "-sEXPORTED_FUNCTIONS=['_wp_scan','_wp_scan_get_vars_json','_wp_scan_free',"
    "'_wp_scan_messages_layout',"
    "'_wp_normalize','_wp_nc3_scan','_wp_nc3_scan_get_vars_json','_wp_nc3_normalize','_wp_nc3_scan_free',"
    "'_wp_nc3_full_layout',"
    "'_wp_open_from_float_arrays',"
    "'_wp_close','_wp_nx','_wp_ny','_wp_nt',"
    "'_wp_ds_lats_ptr','_wp_ds_lons_ptr','_wp_ds_data_ptr','_wp_ds_lat2d_ptr','_wp_ds_lon2d_ptr',"
    "'_wp_find_nearest_lat','_wp_find_nearest_lon','_wp_query','_wp_free','_wp_malloc','_wp_memcpy',"
    "'_wp_is_curvilinear','_wp_find_nearest_cell','_wp_cell_lat','_wp_cell_lon',"
    "'_wp_grid_coords','_wp_normalize_range','_wp_grid_resample_polar','_wp_scan_decode_cell',"
    "'_malloc','_free']",
    "-sALLOW_MEMORY_GROWTH=1",
    "-sMODULARIZE=1",
    "-sEXPORT_ES6=1",
    "-sEXPORT_NAME=HydroSliceWasm",
    "-sENVIRONMENT=web,worker,node",
    "-sNO_EXIT_RUNTIME=1",
    "-o", "hydroslice.js",
    "wasm_api.c",
    os.path.join("..", "tools", "query_refs.c"),
    os.path.join("..", "core", "util", "base64.c"),
    os.path.join("..", "helper", "grib2converthelpers.c"),
    os.path.join("..", "formats", "grib2", "grib2_metadata.c"),
    os.path.join("..", "formats", "netcdf", "netcdf3.c"),
    "-lm",
]

print("Building...")
result = subprocess.run(cmd)
print("\nBUILD SUCCESS" if result.returncode == 0 else "\nBUILD FAILED")
sys.exit(result.returncode)
