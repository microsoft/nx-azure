// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

module.exports = {
  name: 'azure-cloud',
  preset: '../../jest.config.js',
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'html'],
  coverageDirectory: '../../coverage/libs/azure-cloud',
};
