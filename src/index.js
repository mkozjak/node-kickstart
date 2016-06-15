'use strict'

const application = require("./application")
const Promise = require("bluebird")

require("babel-runtime/core-js/promise").default = Promise

Promise.onPossiblyUnhandledRejection(function(error)
{
    throw error
})

application()
