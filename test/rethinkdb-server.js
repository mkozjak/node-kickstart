"use strict"

const exec = require("child_process").exec
const os = require("os")

let proc = null

module.exports.start = new Promise(function(resolve, reject)
{
    switch (os.platform())
    {
        case "darwin":
            exec("rethinkdb --daemon",
            {
                cwd: "/tmp"
            }, function(error, output)
            {
                if (!error)
                    return resolve()

                if (error.code == 1 && output.indexOf("already") != -1)
                    return resolve()

                reject(error)
            })

            break
    }
})
