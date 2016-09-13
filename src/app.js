"use strict"

const Promise = require("bluebird")

require("babel-runtime/core-js/promise").default = Promise

main()

async function main()
{
    const config = require("./config")
    const Database = require("./lib/database")
    const ServiceBus = require("./lib/service_bus")
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
        let service_bus = new ServiceBus(_env, config.service_bus)
        _env.sb_connection = await service_bus.connect()

        // add service bus connection to logger
        _env.log.addTarget(utils.ServiceBusLogger,
            {
                channel: _env.sb_connection,
                subject: config.service_bus.queues.logs.subject
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
        let db = new Database(_env, config.database)
        _env.db = await db.initialize()
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
