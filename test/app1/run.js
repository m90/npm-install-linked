#!/usr/bin/env node

const pkg = require('@monorepo/pkg1')

console.log(pkg.greet({ name: 'npm' }))
