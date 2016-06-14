'use strict'

const Promise = require('bluebird')

require('babel-runtime/core-js/promise').default = Promise

async function loop() {}

Promise.onPossiblyUnhandledRejection(function(error) {
    throw error
})

loop()