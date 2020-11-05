#!/bin/bash
# echo "darwin"

tar -xf ./bin/azcopy_linux.tar.gz -C ./bin
cp ./bin/azcopy*/azcopy ./bin/azcopy
rm -rf ./bin/azcopy_*
chmod +x ./bin/azcopy