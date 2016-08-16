"use strict"

const amqp = require("amqplib")
const assertArgs = require("assert-args")
const bristol = require("bristol")
const rethinkdb = require("rethinkdb")
const stringify = require("json-stringify-safe")
const url = require("url")

module.exports.setConfig = function(config)
{
    assertArgs(arguments,
    {
        "config": "object"
    })

    let argv = require('yargs').usage("Usage: npm start -- [options]")
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
        .option("database-hostname",
        {
            describe: "database hostname",
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

    if (argv["database-hostname"])
        config.database.hostname = argv["database-hostname"]

    return argv
}

module.exports.setLogging = function(config)
{
    assertArgs(arguments,
    {
        "config": "object"
    })

    bristol.addTarget("file",
        {
            file: config.logging.file.output
        })
        .withHighestSeverity(config.logging.file.level)

    bristol.addTarget("console")
        .withHighestSeverity(config.logging.console.level)

    return bristol
}

module.exports.ServiceBusLogger = function(options, severity, date, message)
{
    options.channel.publish(options.exchange, "test123", new Buffer(stringify(message)))
}

module.exports.setupServiceBus = async function(config)
{
    assertArgs(arguments,
    {
        "config": "object"
    })

    switch (config.service_bus.type)
    {
        case "rabbitmq":
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

            break
    }
}

module.exports.setupDatabase = async function(config)
{
    switch (config.database.type)
    {
        case "rethinkdb":
            try
            {
                let connection = await rethinkdb.connect(
                {
                    host: config.database.hostname,
                    port: config.database.port,
                    db: config.database.name,
                    user: config.database.username,
                    password: config.database.password
                })
            }
            catch (error)
            {
                throw error
            }

            break
    }
}
