import wasmModule from './binarization.js';

wasmModule().then((e) => {
    console.log(`It works! Version ${e.version()}`)
});
