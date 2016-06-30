'use strict'

const assertArgs = require("assert-args")
const bunyan = require("bunyan")
const stringify = require("json-stringify-safe")

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
                queue: config.logging.queue_name
            })
        }]
    })
}
