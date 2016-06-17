"use strict"

const exec = require('child_process').exec
const rabbitmq = require("./rabbitmq-server")
const rethinkdb = require("./rethinkdb-server")
const spawn = require("child_process").spawn

let app = null

describe("# api test", function()
{
    this.timeout(3000)

    before("start rabbitmq server", function(done)
    {
        rabbitmq.start.then(function()
        {
            done()
        }, function(error)
        {
            done(error)
        })
    })

    before("start rethinkdb server", function(done)
    {
        rethinkdb.start.then(function(resp)
        {
            done()
        }, function(error)
        {
            done(error)
        })
    })

    before("start microservice", function(done)
    {
        exec("ps x | fgrep index.js | fgrep -v 'grep' | wc -l | awk '{$1=$1};1'", function(error, out)
        {
            if (out != 0)
                return done()

            app = spawn('node', ['dist/index.js'])

            done()
        })
    })

    after("stop microservice", function(done)
    {
        if (app != null)
        {
            app.kill("SIGKILL")
        }

        done()
    })

    it("should say something", function() {})
})
