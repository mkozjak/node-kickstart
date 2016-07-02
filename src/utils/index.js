'use strict'

const amqp = require("amqplib")
const assertArgs = require("assert-args")
const bunyan = require("bunyan")
const stringify = require("json-stringify-safe")
const url = require("url")

module.exports.setConfig = function(config)
{
    assertArgs(arguments,
    {
        "config": "object"
    })

    let argv = require('yargs').usage("usage: npm start -- [options]")
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

    return argv
}

module.exports.setLogging = function(config)
{
    assertArgs(arguments,
    {
        "config": "object"
    })

    class DebugStream
    {
        write(data)
        {
            // TODO: support more than one argument
            // FIXME: circular data gets like '[object Object]' here
            process.stdout.write(`${stringify(data)}\n`)
        }
    }

    return bunyan.createLogger(
    {
        name: config.general.app_name,
        streams: [
        {
            level: "trace",
            path: config.logging.trace_file
        },
        {
            type: "raw",
            level: "debug",
            stream: new DebugStream()
        }]
    })
}

module.exports.InfoStream = class
{
    constructor(channel, exchange)
    {
        this.amqp_channel = channel
        this.exchange = exchange
    }

    write(data)
    {
        this.amqp_channel.publish(this.exchange, "test123", new Buffer(stringify(data)))
    }
}

module.exports.setupRabbit = async function(config)
{
    assertArgs(arguments,
    {
        "config": "object"
    })

    let connection = null

    try
    {
        connection = await amqp.connect(url.format(
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

    let channel = await connection.createChannel()
    let queues = config.service_bus.queues

    for (let name in queues)
    {
        try
        {
            switch (queues[name].type)
            {
                // push -> only one consumer takes the job
                case "push":
                    await channel.assertExchange(queues[name].exchange, "topic")
                    break
            }

            return channel
        }
        catch (error)
        {
            throw error
        }
    }

    channel.on("error", (error) =>
    {
        throw error
    })

    channel.on("close", () =>
    {
        throw new Error("channel closed")
    })
}
