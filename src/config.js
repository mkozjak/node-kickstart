'use strict'

module.exports.service_bus = {
    type: "rabbitmq",
    protocol: "amqp",
    hostname: "localhost",
    port: 5672,
    username: "guest",
    password: "guest"
}

module.exports.database = {
    type: "rethinkdb",
    name: "test",
    hostname: "localhost",
    port: 28015,
    username: "admin",
    password: ""
}
