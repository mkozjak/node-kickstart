"use strict"

import assertArgs from "assert-args"
import nats from "nats"
import url from "url"

import handlers from "./handlers"
import utils from "../utils"

export default class ServiceBus
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
            case "nats":
                try
                {
                    this.connection = nats.connect(url.format(
                    {
                        protocol: this.config.protocol,
                        hostname: this.config.hostname,
                        port: this.config.port,
                        slashes: true
                    }))

                    return this.connection
                }
                catch (error)
                {
                    throw error
                }

                break

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

    async handleRequests()
    {
        for (let name in handlers)
        {
            await handlers[name].call(this.env)
        }
    }
}
