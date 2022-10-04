#!/usr/bin/env node

/**
 * Copyright 2021-2022 - Frederik Ring <frederik.ring@gmail.com>
 * SPDX-License-Identifier: MPL-2.0
 */

const path = require('path')
const fs = require('fs')
const cp = require('child_process')

const pkg = require('./package.json')

const FILE_RE = /^file:/

const argv = require('minimist')(process.argv.slice(2), {
  alias: {
    walk: 'W',
    force: 'F',
    'use-lockfile': 'L'
  },
  default: {
    walk: false,
    force: false,
    'use-lockfile': false
  }
})

;(async function main () {
  if (!argv.force) {
    const versionString = await getNpmVersion()
    if (parseInt(versionString, 10) < 7) {
      return `npm version in use is ${versionString}, no need to install nested dependencies`
    }
  }

  let fileDeps = collectFileDeps(process.cwd(), argv.walk)
  fileDeps = fileDeps.sort((a, b) => a.depth > b.depth ? -1 : 1)
  for (const dep of fileDeps) {
    if (dep.location.indexOf(process.cwd()) === 0) {
      // npm 7 installs dependencies for local packages within the same
      // fs root just fine so they can be skipped.
      continue
    }
    await install(dep.location, argv['use-lockfile'])
  }
  return fileDeps.length
    ? `Installed transient dependencies for ${fileDeps.length} "file:" package(s)`
    : 'No "file:" packages were found, nothing to do.'
})()
  .then((result) => {
    console.log('%s: %s', pkg.name, result)
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

function collectFileDeps (root, walk, depth = 0) {
  const { dependencies, devDependencies } = require(path.resolve(root, './package.json'))
  const deps = Object.assign({}, dependencies, devDependencies)
  let fileDeps = []
  for (const dep of Object.values(deps)) {
    if (FILE_RE.test(dep)) {
      const location = path.resolve(root, dep.replace(FILE_RE, ''))
      fileDeps.push({ location, depth })
      if (walk) {
        fileDeps = [...fileDeps, ...collectFileDeps(location, walk, depth + 1)]
      }
    }
  }
  return fileDeps
}

function install (root, useLockfile = false) {
  return new Promise(function (resolve, reject) {
    let cmd = 'npm i'
    if (useLockfile && fs.existsSync(path.resolve(root, './package-lock.json'))) {
      cmd = 'npm ci'
    }
    const npm = cp.exec(cmd, {
      cwd: root
    })
    npm.on('error', function (err) {
      reject(err)
    })
    npm.on('exit', function (code) {
      if (code) {
        reject(
          new Error(`Installing dependencies for "${root}" failed with exit code ${code}`)
        )
        return
      }
      resolve()
    })
  })
}

function getNpmVersion () {
  return new Promise(function (resolve, reject) {
    const npm = cp.exec('npm -v')
    let buf = ''
    npm.stdout.on('data', function (data) {
      buf += data
    })
    npm.on('error', function (err) {
      reject(err)
    })
    npm.on('exit', function (code) {
      if (code) {
        reject(
          new Error(`Determining npm version in use failed with exit code ${code}`)
        )
        return
      }
      resolve(buf.trim())
    })
  })
}
