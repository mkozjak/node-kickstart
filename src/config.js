"use strict"

module.exports.general = {
    app_name: "kickstart"
}

module.exports.service_bus = {
    type: "rabbitmq",
    protocol: "amqp",
    hostname: "localhost",
    port: 5672,
    username: "guest",
    password: "guest",
    queues:
    {
        logs:
        {
            exchange: "logging",
            type: "push", // for topic exchange
        }
    }
}

module.exports.database = {
    type: "rethinkdb",
    name: "test",
    hostname: "localhost",
    port: 28015,
    username: "admin",
    password: ""
}

module.exports.logging = {
    service_bus:
    {
        queue_name: "logs",
        level: "info"
    },
    console:
    {
        level: "debug"
    },
    file:
    {
        output: "logs/trace.log",
        level: "trace"
    }
}
