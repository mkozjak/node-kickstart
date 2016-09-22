"use strict"

describe("# cleanup", function()
{
    it("stop microservice", function()
    {
        if (global.app != null)
        {
            global.app.removeListener("close", global.closeHandler)
            global.app.kill("SIGKILL")
        }
    })

    it("stop nats server", function(done)
    {
        if (!global.nats_id)
            return done()

        let container = global.docker.getContainer(global.nats_id)

        container.stop(function(error)
        {
            if (error)
                return done(error)

            container.remove(function(error)
            {
                if (error)
                    return done(error)

                done()
            })
        })
    })

    it("stop rethinkdb server", function(done)
    {
        if (!global.rdb_id)
            return done()

        let container = docker.getContainer(global.rdb_id)

        container.stop(function(error)
        {
            if (error)
                return done(error)

            container.remove(function(error)
            {
                if (error)
                    return done(error)

                done()
            })
        })
    })
})
