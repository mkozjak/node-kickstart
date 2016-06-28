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
    // TODO: move elsewhere?
    const argv = utils.setConfig(config)

    // TODO: logger setup (bunyan?)
    // TODO: move elsewhere?
    const logger = require("bunyan").createLogger(
    {
        name: config.general.app_name,
        streams: [
        {
            stream: process.stdout,
            level: "debug"
        },
        {
            type: "raw",
            level: "info",
            stream: require("bunyan-amqp")(
            {
                host: config.service_bus.hostname,
                port: config.service_bus.port,
                username: config.service_bus.username,
                password: config.service_bus.password,
                queue: config.service_bus.queue_name
            })
        }]
    })

    logger.info("test123")

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
}
