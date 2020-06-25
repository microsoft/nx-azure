# nx-azure

A set of tools for Nx monorepo's working with Azure.


# @nx-azure/storage-cache

A tool for using Azure Storage as a distributed computational cache.

## Setup

First install the package by running:

```bash
yarn add -D @nx-azure/storage-cache
```

Then run the init schematic by running:

```bash
yarn nx generate @nx-azure/storage-cache:init --storageAccount=... --storageContainer=...
```

This will make the necessary changes to nx.json in your workspace, so you are about 90% of the way there with regards to using Azure as a distributed computational cache.

## Authentication

Curren this just supports SAS Token's in order to authenticate with Azure Storage, but other methods could be added, please feel free to open a issue/PR.

There are three ways you can pass the SAS Token to @nx-azure/storage-cache.

1. Put the SAS Token in your nx.json file. This is not recommended for anything other than just testing, since you don't want to accidentally check in this SAS Token.
2. Set the SAS Token on the Environment Variable AZURE_CACHE_SAS_TOKEN.
3. Create a .env.secrets file at the root of your Nx workspace, and add AZURE_CACHE_SAS_TOKEN to it. @nx-azure/storage-cache will read this .env.secrets file, and then use the AZURE_CACHE_SAS_TOKEN variable from it.

## Building the @nx-azure/storage-cache lib

Run `yarn nx run storage-cache:build` to build this plugin.

## Prior Art

This Nx plugin is heavily inspired by, and wouldn't be possible without, the Nx Cloud plugin developed by [Nrwl](https://github.com/nrwl/nx). If you're not using Azure, you should probably go check out the Nx Cloud plugin, since it will probably be more up to date than @nx-azure/storage-cache.

# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.opensource.microsoft.com.

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
