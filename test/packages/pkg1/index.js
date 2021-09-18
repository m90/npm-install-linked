const _ = require('lodash')

exports.greet = _.template('hello <%= name %>!')
