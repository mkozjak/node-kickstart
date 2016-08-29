"use strict"

const assertArgs = require("assert-args")
const readdir = require("fs").readdirSync
const thinky = require("thinky")
const utils = require("../utils")

module.exports = class Database
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

        this.r = null
        this.models = {}
    }

    async initialize()
    {
        switch (this.config.type)
        {
            case "rethinkdb":
                try
                {
                    this.r = thinky(
                    {
                        host: this.config.hostname,
                        port: this.config.port,
                        db: this.config.name,
                        user: this.config.username,
                        password: this.config.password,
                        createDatabase: false,
                        silent: true
                    })

                    this.models = this._loadModels()

                    return this.r
                }
                catch (error)
                {
                    throw error
                }
        }
    }

    _loadModels()
    {
        for (let file of readdir(__dirname + "/models"))
        {
            if (file.indexOf(".") === 0 || file.indexOf(".swp") !== -1)
                continue

            let model = require(__dirname + "/models/" + file)(this.r)

            if (!model)
                continue

            this.models[model.getTableName()] = model

            return this.models
        }
    }
}
