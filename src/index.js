"use strict"

const Promise = require("bluebird")

require("babel-runtime/core-js/promise").default = Promise

main()

async function main()
{
    const config = require("./config")
    const utils = require("./lib/utils")

    // fetch configuration
    // TODO: try getting conf from remote (kubernetes/rancher metadata/docker swarm?)

    // parse command-line arguments
    utils.setConfig(config)

    // variables store for forwarding further
    const _env = {}

    // setup logging
    _env.log = utils.setLogging(config)

    // setup service bus connection
    try
    {
        _env.amqp = await utils.setupServiceBus(config)

        // add service bus connection to logger
        _env.log.addTarget(utils.ServiceBusLogger,
            {
                channel: _env.amqp,
                exchange: config.service_bus.queues.logs.exchange
            })
            .withHighestSeverity(config.logging.service_bus.level)

        // test-specific signals
        _env.log.debug("_app_ready")
    }
    catch (error)
    {
        throw error
    }

    // setup database connection
    try
    {
        _env.db = await utils.setupDatabase(config)
    }
    catch (error)
    {
        throw error
    }

}

Promise.onPossiblyUnhandledRejection(function(error)
{
    throw error
})
