"use strict"

const general = {
    app_name: "kickstart"
}

const service_bus = {
    type: "nats",
    protocol: "nats",
    hostname: "localhost",
    port: 4222,
    username: "guest",
    password: "guest",
    queues:
    {
        logs:
        {
            subject: "kickstart.logs"
        }
    }
}

const database = {
    type: "rethinkdb",
    name: "test",
    hostname: "localhost",
    port: 28015,
    username: "admin",
    password: ""
}

const logging = {
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

export
{
    general,
    service_bus,
    database,
    logging
}
