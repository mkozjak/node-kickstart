'use strict'

const config = require("./config")
const utils = require("./utils")

module.exports = async function()
{
    // fetch configuration
    // TODO: try getting conf from remote (kubernetes/rancher metadata/docker swarm?)

    // parse command-line arguments
    utils.setConfig(config)

    // setup logging
    const log = utils.setLogging(config)

    // setup service bus connection
    try
    {
        let channel = await utils.setupServiceBus(config)

        // add service bus connection to logger
        log.addTarget(utils.ServiceBusLogger,
            {
                channel: channel,
                exchange: config.service_bus.queues.logs.exchange
            })
            .withHighestSeverity(config.logging.service_bus.level)

        // test-specific signals
        log.debug("_app_ready")
    }
    catch (error)
    {
        throw error
    }

    // setup database connection
    try
    {
        await utils.setupDatabase(config)
    }
    catch (error)
    {
        throw error
    }

}
