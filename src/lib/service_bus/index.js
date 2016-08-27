"use strict"

const amqp = require("amqplib")
const assertArgs = require("assert-args")
const url = require("url")
const utils = require("../utils")

module.exports = class ServiceBus
{
    constructor(env, config)
    {
        let args = assertArgs(arguments,
        {
            "env": "object",
            "[config]": "object"
        })

        this.env = args.env
        this.config = args.config
    }

    async connect()
    {
        switch (this.config.type)
        {
            case "rabbitmq":
                let connection = null

                try
                {
                    connection = await amqp.connect(url.format(
                    {
                        protocol: this.config.protocol,
                        auth: this.config.username + ":" + this.config.password,
                        hostname: this.config.hostname,
                        port: this.config.port,
                        slashes: true
                    }))
                }
                catch (error)
                {
                    throw error
                }

                this.channel = await connection.createChannel()
                let queues = this.config.queues

                for (let name in queues)
                {
                    try
                    {
                        switch (queues[name].type)
                        {
                            // push -> only one consumer takes the job
                            case "push":
                                await this.channel.assertExchange(queues[name].exchange, "topic")
                                break
                        }
                    }
                    catch (error)
                    {
                        throw error
                    }
                }

                this.channel.on("error", (error) =>
                {
                    throw error
                })

                this.channel.on("close", () =>
                {
                    throw new Error("channel closed")
                })

                return this.channel
        }
    }
}
