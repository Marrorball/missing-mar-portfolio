// Bytes in assets/kiosk/kiosk.glb. GitHub Pages sends the model gzipped, so
// the download's Content-Length is the compressed size and would push the
// loading percent past 100; the percent is counted against this instead.
// scripts/kiosk/build.py rewrites the number after every export.
export const KIOSK_BYTES = 6173088;
