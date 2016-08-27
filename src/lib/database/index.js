"use strict"

const assertArgs = require("assert-args")
const rethinkdb = require("rethinkdb")
const utils = require("../utils")

module.exports = class Database
{
    constructor(env, config)
    {
        let args = assertArgs(arguments,
        {
            "env": utils.checkEnvVars.bind("database"),
            "[config]": "object"
        })

        this.env = args.env
        this.config = args.config
    }

    async connect()
    {
        switch (this.config.type)
        {
            case "rethinkdb":
                try
                {
                    return await rethinkdb.connect(
                    {
                        host: this.config.hostname,
                        port: this.config.port,
                        db: this.config.name,
                        user: this.config.username,
                        password: this.config.password
                    })
                }
                catch (error)
                {
                    throw error
                }
        }
    }

}
