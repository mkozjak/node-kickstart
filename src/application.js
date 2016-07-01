'use strict'

const config = require("./config")
const rethinkdb = require("rethinkdb")
const utils = require("./utils")

module.exports = async function()
{
    // fetch configuration
    // TODO: try getting conf from remote (kubernetes/rancher metadata/docker swarm?)

    // parse command-line arguments
    utils.setConfig(config)

    // setup logging
    const log = utils.setLogging(config)

    // setup rabbitmq connection
    try
    {
        await utils.setupRabbit(config)
        log.debug("_app_ready")
    }
    catch (error)
    {
        throw error
    }

}
