#!/bin/bash

set -e

export OPTIMIZE="-Os"
export LDFLAGS="${OPTIMIZE}"
export CFLAGS="${OPTIMIZE}"
export CXXFLAGS="${OPTIMIZE}"

echo "============================================="
echo "Compiling, champ"
echo "============================================="
(
  # Compile C/C++ code
  em++ \
    -g \
    -gseparate-dwarf=temp.debug.wasm \
    ${OPTIMIZE} \
    --bind \
    -s STRICT=1 \
    -s EXPORTED_RUNTIME_METHODS="['cwrap','ccall']" \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s MALLOC=emmalloc \
    -s MODULARIZE=1 \
    -s EXPORT_ES6=1 \
    -o ./binarization.js \
    --no-entry \
    cpp/binarization.cpp

  # Create output folder
  mkdir -p dist
  # Move artifacts
  mv binarization.{js,wasm} dist
)
echo "============================================="
echo "Well done! Hacking is fancy ❤"
echo "============================================="
