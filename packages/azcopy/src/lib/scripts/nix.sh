#!/bin/bash
# echo "nix"

tar -xf ./bin/azcopy_linux.tar.gz -C ./bin
cp ./bin/azcopy*/azcopy ./bin/azcopy
rm -rf ./bin/azcopy_*
chmod +x ./bin/azcopy