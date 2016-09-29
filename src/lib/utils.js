"use strict"

import assertArgs from "assert-args"
import bristol from "bristol"
import stringify from "json-stringify-safe"

function checkEnvVars(value)
{
    if (typeof(value) !== "object")
        throw new Error("env should be an object")

    if (!value.log && this !== "logger")
        throw new Error("env.log is required")

    if (!value.amqp && this !== "service-bus")
        throw new Error("env.amqp is required")

    if (!value.db && this !== "database")
        throw new Error("env.db is required")
}

function setConfig(config)
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
        .option("database-recreate",
        {
            describe: "drop and recreate existing database tables",
            type: "string"
        })
        .option("database-initial-data",
        {
            describe: "fill database tables with initial data",
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

    if (argv["database-recreate"])
        config.database.recreate = argv["database-recreate"]

    if (argv["database-initial-data"])
        config.database.initial_data = argv["database-initial-data"]

    return argv
}

function setLogging(config)
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

function ServiceBusLogger(options, severity, date, message)
{
    options.channel.publish(options.subject, message)
}

export
{
    checkEnvVars,
    setConfig,
    setLogging,
    ServiceBusLogger
}
