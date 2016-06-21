'use strict'

const amqp = require("amqplib")
const config = require("./config")
const url = require("url")

module.exports = async function()
{
    // fetch configuration
    // TODO: try getting conf from remote (kubernetes/rancher metadata/docker swarm?)

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