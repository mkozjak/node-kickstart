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
        let channel = await utils.setupRabbit(config)

        // add rabbitmq connection to logger
        log.addStream(
        {
            type: "raw",
            level: "info",
            stream: new utils.InfoStream(channel, config.service_bus.queues.logs.exchange)
        })

        log.debug("_app_ready")
        log.info("test123")
    }
    catch (error)
    {
        throw error
    }

}
