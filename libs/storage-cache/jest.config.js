// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

module.exports = {
  name: 'storage-cache',
  preset: '../../jest.config.js',
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../../coverage/libs/storage-cache',
};
