# Playwright script subresource analysis

This is a simple tool that uses Playwright to analyze the subresources loaded by a script. The tool loads the script in a browser, and analyzes 

## Usage

```
pnpm install
pnpm run analyze-script https://example.com/my-script.js
```

Example output:

```
Requests:

- URL: https://example.com/script.js
  Size: 1000 bytes
  SRI Hash: sha384-1234567890abcdef
  Initiator: undefined
- URL: https://example.com/additional-script.js
  Size: 2000 bytes
  SRI Hash: sha384-0987654321fedcba
  Initiator: https://example.com/script.js
```

If you want to use the playground scripts in `/example` to see how the tool works, run `pnpm run example-server` to start a local server, and then run `pnpm run analyze-script http://localhost:8080/foo.js` in another terminal to analyze the script.

