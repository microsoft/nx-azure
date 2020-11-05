#!/bin/bash
# echo "*nix"

tar -xf ./bin/azcopy* -C ./bin
cp ./bin/azcopy*/azcopy ./bin/azcopy
rm -rf ./bin/azcopy_*
chmod +x ./bin/azcopy
