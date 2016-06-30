'use strict'

const amqp = require("amqplib")
const config = require("./config")
const rethinkdb = require("rethinkdb")
const url = require("url")
const utils = require("./utils")

module.exports = async function()
{
    // fetch configuration
    // TODO: try getting conf from remote (kubernetes/rancher metadata/docker swarm?)

    // parse command-line arguments
    utils.setConfig(config)

    // TODO: logger setup (bunyan?)
    const log = utils.setLogging(config)

    let esb = null

    try
    {
        esb = await amqp.connect(url.format(
        {
            protocol: config.service_bus.protocol,
            auth: config.service_bus.username + ":" + config.service_bus.password,
            hostname: config.service_bus.hostname,
            port: config.service_bus.port,
            slashes: true
        }))
    }
    catch (error)
    {
        throw error
    }

    if (process.send)
        process.send("ready")
}
