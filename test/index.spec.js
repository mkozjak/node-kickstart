"use strict"

const Docker = require("dockerode")
const exec = require('child_process').exec
const pkg = require("../package.json")
const spawn = require("child_process").spawn

let docker = new Docker()
let app = null

describe("# api test", function()
{
    this.timeout(10000)

    let rmq_id = null,
        rdb_id = null

    /* external services */
    before("start rabbitmq service", function(done)
    {
        runContainer("rabbitmq", "rabbitmq").then(function(id)
        {
            rmq_id = id
            done()
        }, function(error)
        {
            done(error)
        })
    })

    before("start rethinkdb service", function(done)
    {
        runContainer("rethinkdb", "rethinkdb").then(function(id)
        {
            rdb_id = id
            done()
        }, function(error)
        {
            done(error)
        })
    })

    after("stop rabbitmq server", function(done)
    {
        if (!rmq_id)
            return done()

        let container = docker.getContainer(rmq_id)

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

    after("stop rethinkdb server", function(done)
    {
        if (!rdb_id)
            return done()

        let container = docker.getContainer(rdb_id)

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

    /* main/developed service */
    before("start microservice", function(done)
    {
        let cmd = `ps x | fgrep 'node ${pkg.main}' | fgrep -v 'fgrep' | wc -l | awk '{$1=$1};1'`

        exec(cmd, function(error, out)
        {
            if (error)
                return done(error)

            if (out != 0)
                return done()

            app = spawn('node', [pkg.main])

            done()
        })
    })

    after("stop microservice", function(done)
    {
        if (app !== null)
            app.kill("SIGKILL")

        done()
    })

    it("should say something", function() {})
})

function runContainer(image_name, container_name)
{
    return new Promise(function(resolve, reject)
    {
        docker.listContainers(function(error, containers)
        {
            if (error)
                return reject(error)

            for (let container of containers)
            {
                if (container.Image === image_name)
                    return resolve()
            }

            let image = docker.getImage(image_name)

            image.inspect(function(error, data)
            {
                if (error)
                    return reject(error)

                let bindings = {
                    PortBindings:
                    {}
                }

                for (let port of Object.keys(data.ContainerConfig.ExposedPorts))
                {
                    bindings.PortBindings[port] = [
                    {
                        "HostPort": port.split("/")[0]
                    }]
                }

                docker.createContainer(
                {
                    Image: image_name,
                    name: container_name,
                    HostConfig: bindings
                }, function(error, container)
                {
                    if (error)
                        return reject(error)

                    container.start(function(error, data)
                    {
                        if (error)
                            return reject(error)

                        resolve(container.id)
                    })
                })
            })
        })
    })
}
