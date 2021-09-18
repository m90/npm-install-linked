#!/usr/bin/env node

/**
 * Copyright 2021 - Frederik Ring <frederik.ring@gmail.com>
 * SPDX-License-Identifier: MPL-2.0
 */

const path = require('path')
const cp = require('child_process')

const argv = require('minimist')(process.argv.slice(2), {
  alias: {
    walk: 'W',
    force: 'F'
  },
  default: {
    walk: false,
    force: false
  }
})

;(async () => {
  if (!argv.force) {
    const npmVersion = await checkNpmVersion()
    if (parseInt(npmVersion, 10) < 7) {
      return `npm version in use is ${npmVersion}, no need to install nested dependencies`
    }
  }

  let fileDeps = walkFileDeps(process.cwd(), argv.walk)
  fileDeps = fileDeps.sort((a, b) => a.depth > b.depth ? -1 : 1)
  for (const dep of fileDeps) {
    if (dep.location.indexOf(process.cwd()) === 0) {
      continue
    }
    await install(dep.location)
  }
  return `Installed transient dependencies for ${fileDeps.length} "file:" package(s)`
})()
  .then((result) => {
    console.log('install-file-deps: %s', result)
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

function walkFileDeps (root, walk, depth = 0) {
  const pkg = require(path.resolve(root, './package.json'))
  const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies)
  let fileDeps = []
  for (const key in deps) {
    if (/^file:/.test(deps[key])) {
      const location = path.resolve(root, deps[key].replace(/^file:/, ''))
      fileDeps.push({ location, depth })
      if (walk) {
        fileDeps = [...fileDeps, ...walkFileDeps(location, walk, depth + 1)]
      }
    }
  }
  return fileDeps
}

function install (root) {
  return new Promise(function (resolve, reject) {
    const npm = cp.exec('npm install', {
      cwd: root
    })
    npm.on('exit', function (code) {
      if (code) {
        reject(new Error(`Installing dependencies for "${root}" failed with exit code ${code}`))
        return
      }
      resolve()
    })
  })
}

function checkNpmVersion () {
  return new Promise(function (resolve, reject) {
    const npm = cp.exec('npm -v')
    let buf = ''
    npm.stdout.on('data', function (data) {
      buf += data
    })
    npm.on('exit', function (code) {
      if (code) {
        reject(new Error(`Determining npm version in use failed with exit code ${code}`))
        return
      }
      resolve(buf.trim())
    })
  })
}
