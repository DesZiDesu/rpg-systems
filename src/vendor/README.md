# Bundled libraries

- **fflate 0.8.2**, MIT, https://github.com/101arrowz/fflate — browser ES module used for local ZIP compression/inflation. License in `fflate/LICENSE`.
- **js-sha256 0.11.1**, MIT, https://github.com/emn178/js-sha256 — fallback for browsers on plain HTTP LAN origins without `crypto.subtle`. The hashing implementation is unchanged; the wrapper exports an ES module and disables CommonJS/AMD/global environment detection. License in `js-sha256/LICENSE`.

These files are bundled with the extension; World Pack operations do not download executable dependencies from a CDN.
