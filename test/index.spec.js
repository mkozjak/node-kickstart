"use strict"

const Docker = require("dockerode")
const exec = require("child_process").exec
const fs = require("fs")
const os = require("os")
const pkg = require("../package.json")
const spawn = require("child_process").spawn
const url = require("url")

let app = null
let docker = null

if (process.env["DOCKER_CERT_PATH"])
{
    fs.stat(process.env["DOCKER_CERT_PATH"], function(error)
    {
        if (error)
            delete process.env["DOCKER_CERT_PATH"]

        docker = new Docker()
    })
}
else docker = new Docker()

describe("# basic functionality", function()
{
    this.timeout(300000)

    let rmq_id = null,
        rdb_id = null

    before("check if docker service is running", function(done)
    {
        switch (os.platform())
        {
            case "darwin":
                const docker_machine = "/usr/local/bin/docker-machine"

                exec(`${docker_machine} status default`, function(error, stdout, stderr)
                {
                    if (error)
                    {
                        if (stderr.indexOf("Host does not exist: \"default\"") !== -1)
                        {
                            createDockerHost().then(function()
                                {
                                    console.log(" done")
                                    setEnvVars().then(done)
                                })
                                .catch(function(error)
                                {
                                    done(error)
                                })
                        }
                        else return done(error)
                    }
                    else
                    {
                        if (stdout.trim() !== "Running")
                            return done(new Error("docker service not running!"))

                        if (!process.env.DOCKER_HOST)
                        {
                            setEnvVars().then(done, function(error)
                            {
                                done(error)
                            })
                        }

                        else done()
                    }
                })

                function createDockerHost()
                {
                    return new Promise(function(resolve, reject)
                    {
                        process.stdout.write("  ==> creating a new virtualbox vm ")

                        let dots = setInterval(function()
                        {
                            process.stdout.write(".")
                        }, 2000)

                        exec(`${docker_machine} create -d virtualbox ` +
                            `--virtualbox-memory 2048 --virtualbox-disk-size 204800 default`,
                            function(error, stdout, stderr)
                            {
                                if (error)
                                    return reject(error)

                                clearInterval(dots)
                                resolve()
                            })
                    })
                }

                function setEnvVars()
                {
                    return new Promise(function(resolve, reject)
                    {
                        exec(`${docker_machine} env default`, function(error, stdout)
                        {
                            if (error)
                                return reject(error)

                            for (let line of stdout.split("\n"))
                            {
                                if (line.indexOf("export ") === -1)
                                    continue

                                let entry = line.split("export ").pop().split("=")
                                process.env[entry[0]] = entry[1].replace(/"/g, "")
                            }

                            if (!process.env["DOCKER_CERT_PATH"])
                                return reject(new Error(
                                    "failed to set mandatory DOCKER_CERT_PATH env var"))

                            // we need to set env vars after
                            // the Docker object has been instantiated
                            let cert_path = process.env["DOCKER_CERT_PATH"]

                            docker.modem.ca = fs.readFileSync(cert_path + "/ca.pem")
                            docker.modem.cert = fs.readFileSync(cert_path + "/cert.pem")
                            docker.modem.key = fs.readFileSync(cert_path + "/key.pem")
                            docker.modem.protocol = "https"
                            delete docker.modem.socketPath

                            resolve()
                        })
                    })
                }

                break

            case "linux":
                exec("systemctl status docker", function(error, _, stderr)
                {
                    if (error && error.code !== 0)
                        return done(new Error("docker service not running!"))

                    if (stderr)
                        return done(stderr)

                    done()
                })

                break
        }
    })

    // external services
    before("start rabbitmq service", function(done)
    {
        runContainer("rabbitmq", "latest", "rabbitmq").then(function(id)
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
        runContainer("rethinkdb", "latest", "rethinkdb").then(function(id)
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

    // main/developed service
    before("start microservice", function(done)
    {
        let cmd = `ps x | fgrep 'node ${pkg.main}' | fgrep -v 'fgrep' | wc -l | awk '{$1=$1};1'`

        exec(cmd, function(error, out)
        {
            if (error)
                return done(error)

            if (out != 0)
                return done()

            let options = [pkg.main]

            if (os.platform() === "darwin")
                options.push("service-bus-hostname", url.parse(process.env.DOCKER_HOST).hostname)

            app = spawn("node", options)

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

function runContainer(image_name, tag, container_name)
{
    let image_tag = image_name + ":" + tag

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

            docker.listImages(function(error, list)
            {
                if (error)
                    return reject(error)

                for (let i = 0, len = list.length; i < len; i++)
                {
                    if (list[i].RepoTags.indexOf(image_tag) !== -1)
                    {
                        // we already have the image downloaded, so we can start it
                        return startImage().then(function(id)
                        {
                            resolve(id)
                        }, function(error)
                        {
                            reject(error)
                        })
                    }
                }

                // no image present, download and start
                fetchImage().then(function()
                {
                    startImage().then(function(id)
                    {
                        resolve(id)
                    }, function(error)
                    {
                        reject(error)
                    })
                }, function(error)
                {
                    reject(error)
                })
            })

            function fetchImage()
            {
                return new Promise(function(resolve, reject)
                {
                    process.stdout.write("  ==> fetching image " + image_tag + " ")

                    docker.pull(image_tag, function(error, stream)
                    {
                        if (error)
                            return reject(error)

                        stream.on("data", function()
                        {
                            process.stdout.write(".")
                        })
                        stream.once("end", function()
                        {
                            console.log(" done")
                            resolve()
                        })
                    })
                })
            }

            function startImage()
            {
                return new Promise(function(resolve, reject)
                {
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
            }
        })
    })
}
