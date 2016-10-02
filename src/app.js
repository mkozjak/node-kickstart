"use strict"

import Promise from "bluebird"

import * as config from "./config"
import Database from "./lib/database"
import ServiceBus from "./lib/service_bus"
import * as utils from "./lib/utils"

require("babel-runtime/core-js/promise").default = Promise

main()

/**
 * Main application function
 * @return {Undefined}
 */
async function main()
{
    // fetch configuration
    // TODO: try getting conf from remote (kubernetes/rancher metadata/docker swarm?)

    // parse command-line arguments
    utils.setConfig(config)

    // variables store for forwarding further
    const _env = {}
    let service_bus = null

    // setup logging
    _env.log = utils.setLogging(config)

    // setup service bus connection
    try
    {
        service_bus = new ServiceBus(_env, config.service_bus)
        _env.sb = await service_bus.connect()

        // add service bus connection to logger
        _env.log.addTarget(utils.ServiceBusLogger,
            {
                channel: _env.sb,
                subject: config.service_bus.queues.logs.subject
            })
            .withHighestSeverity(config.logging.service_bus.level)
    }
    catch (error)
    {
        throw error
    }

    // setup database connection
    try
    {
        const db = new Database(_env, config.database)
        _env.db = await db.initialize()
    }
    catch (error)
    {
        throw error
    }

    // start handling requests
    await service_bus.handleRequests()

    // send a signal that the app has started
    setImmediate(function()
    {
        _env.log.debug("_app_ready")
    })
}

Promise.onPossiblyUnhandledRejection(function(error)
{
    throw error
})
