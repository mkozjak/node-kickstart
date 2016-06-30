'use strict'

const config = require("./config")
const rabbit = require("rabbit.js")
const rethinkdb = require("rethinkdb")
const url = require("url")
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
    let amqp_context = null

    try
    {
        amqp_context = rabbit.createContext(url.format(
        {
            protocol: config.service_bus.protocol,
            auth: config.service_bus.username + ":" + config.service_bus.password,
            hostname: config.service_bus.hostname,
            port: config.service_bus.port,
            slashes: true
        }))

        amqp_context.on("ready", () =>
        {
            log.debug("_app_ready")
        })

        amqp_context.on("error", (error) =>
        {
            throw error
        })
    }
    catch (error)
    {
        throw error
    }
}
