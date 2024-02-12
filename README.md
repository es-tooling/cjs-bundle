# `@cjs-bundle/*`

This repo holds the scripts for building NPM packages as commonjs bundles.

As packages modernise, they are migrating to
[ES modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules).
In many cases, they choose to no longer offer (and therefore maintain) a common
JS entrypoint.

In an ideal world, everyone would move to ES modules and all would be well.
However, not everyone has the time or priority yet to do such a migration (and
it often isn't a small job).

The job of this repository is to create common JS bundles of those "ESM-only"
packages so you can still upgrade for whatever reason, without having to
migrate yet.

# Usage

Find a supported package and install the `cjs-bundle` version like so:

```sh
npm i -D @cjs-bundle/chai
```

# Supported packages

This is a list of all packages we provide legacy common JS bundles for.

N/A
