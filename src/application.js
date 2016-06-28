'use strict'

const amqp = require("amqplib")
const config = require("./config")
const rethinkdb = require("rethinkdb")
const url = require("url")

module.exports = async function()
{
    // fetch configuration
    // TODO: try getting conf from remote (kubernetes/rancher metadata/docker swarm?)

    // parse command-line arguments
    // TODO: move elsewhere?
    const argv = require('yargs').usage("usage: npm start -- [options]")
        .option("service-bus-hostname",
        {
            describe: "service bus hostname",
            type: "string"
        })
        .option("service-bus-port",
        {
            describe: "service bus port",
            type: "number"
        })
        .option("service-bus-username",
        {
            describe: "service bus username",
            type: "string"
        })
        .option("service-bus-password",
        {
            describe: "service bus password",
            type: "string"
        })
        .help("h")
        .alias("h", "help")
        .argv

    if (argv["service-bus-hostname"])
        config.service_bus.hostname = argv["service-bus-hostname"]

    if (argv["service-bus-port"])
        config.service_bus.port = argv["service-bus-port"]

    if (argv["service-bus-username"])
        config.service_bus.username = argv["service-bus-username"]

    if (argv["service-bus-password"])
        config.service_bus.password = argv["service-bus-password"]

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
