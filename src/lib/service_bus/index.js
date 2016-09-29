"use strict"

import assertArgs from "assert-args"
import nats from "nats"
import url from "url"

import * as handlers from "./handlers"

export default class ServiceBus
{
    constructor(env, config)
    {
        const args = assertArgs([ env, config ],
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
            {
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
            }

        case "rabbitmq":
            {
                /*
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
                const queues = this.config.queues

                for (const name in queues)
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
                */
            }
        }
    }

    async handleRequests()
    {
        for (const name in handlers)
        {
            await handlers[name].call(this.env)
        }
    }
}
