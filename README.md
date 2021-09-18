# npm-install-linked
Install dependencies of linked packages when using npm 7

## What is this good for?

npm 7 [stopped installing transient dependencies][issue] for local dependencies referenced through the `file:` scheme.
For many projects using pre-workspaces monorepos, this prevents migrating to npm 7 as they rely on the behavior of npm 6.
This tool is a band-aid to emulate the previous behavior while still being able to use npm 7.

[issue]: https://github.com/npm/cli/issues/2339

## Usage

Install the package as a dev dependency:

```
npm i npm-install-linked -D
```

and put it in your `package.json`s `postinstall` script:

```json
{
  "scripts": {
    "postinstall": "npm-install-linked"
  }
}
```

## Options

Two options can be passed to the CLI tool:

### `--force`, `-F`

By default, the command will check for the npm version in use and will do nothing if npm is at version 6 or lower.
Pass `--force` to override this behavior and forcefully install dependencies in all versions of npm.

### `--walk`, `-W`

By default, the command will only install dependencies for packages referenced usin the `file:` scheme one level deep.
When passing `--walk` the tool will also install dependencies for such packages referenced by your dependencies.
