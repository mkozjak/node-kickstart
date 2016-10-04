/* eslint no-inner-declarations: 0 */

"use strict"

const exec = require("child_process").exec
const fs = require("fs")
const net = require("net")
const os = require("os")
const fork = require("child_process").fork
const url = require("url")

const config = require("../dist/config")
const Docker = require("dockerode")
const pkg = require("../package.json")

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

    before("check if docker service is running", function(done)
    {
        switch (os.platform())
        {
        case "darwin":
            {
                const docker_machine = "/usr/local/bin/docker-machine"

                // check if docker host is running
                exec(`${docker_machine} status default`, function(error, stdout, stderr)
                {
                    if (error)
                    {
                        if (stderr.indexOf("Host does not exist: \"default\"") !== -1)
                        {
                            // create a new docker host
                            createDockerHost().then(function()
                            {
                                console.log(" done")

                                // set docker environment variables
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
                            return done(new Error("docker service not running! " +
                                  "Use docker-machine to start it."))

                        if (!process.env.DOCKER_HOST)
                        {
                            // set docker environment variables
                            setEnvVars().then(done, function(error)
                            {
                                done(error)
                            })
                        }

                        else done()
                    }
                })

                /**
                 * Create a new Docker Host.
                 * @return {Promise}
                 */
                function createDockerHost()
                {
                    return new Promise(function(resolve, reject)
                    {
                        process.stdout.write("  ==> creating a new virtualbox vm ")

                        const dots = setInterval(function()
                        {
                            process.stdout.write(".")
                        }, 2000)

                        exec(`${docker_machine} create -d virtualbox ` +
                            "--virtualbox-memory 2048 --virtualbox-disk-size 204800 default",
                            function(error)
                            {
                                if (error)
                                    return reject(error)

                                clearInterval(dots)
                                resolve()
                            })
                    })
                }

                /**
                 * Set environment variables.
                 * @return {Promise}
                 */
                function setEnvVars()
                {
                    return new Promise(function(resolve, reject)
                    {
                        exec(`${docker_machine} env default`, function(error, stdout)
                        {
                            if (error)
                                return reject(error)

                            for (const line of stdout.split("\n"))
                            {
                                if (line.indexOf("export ") === -1)
                                    continue

                                const entry = line.split("export ").pop().split("=")
                                process.env[entry[0]] = entry[1].replace(/"/g, "")
                            }

                            if (!process.env["DOCKER_CERT_PATH"])
                                return reject(new Error(
                                    "failed to set mandatory DOCKER_CERT_PATH env var"))

                            // we need to set env vars after
                            // the Docker object has been instantiated
                            const cert_path = process.env["DOCKER_CERT_PATH"]

                            docker.modem.host = url.parse(process.env.DOCKER_HOST).hostname
                            docker.modem.port = url.parse(process.env.DOCKER_HOST).port
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
            }

        case "linux":
            {
                exec("systemctl status docker", function(error, _, stderr)
                {
                    if (error && error.code !== 0)
                        return done(new Error("docker service not running! " +
                              "Use systemctl to start it."))

                    if (stderr)
                        return done(stderr)

                    done()
                })

                break
            }
        }
    })

    // external services
    before("start nats service", function(done)
    {
        runContainer("nats", "latest", "nats").then(function(id)
        {
            global.nats_id = id

            checkService(
                url.parse(process.env.DOCKER_HOST).hostname,
                config.service_bus.port).then(function()
            {
                    done()
                }, function(error)
            {
                    done(new Error("failed starting nats: " + error.toString()))
                })
        }, function(error)
        {
            done(error)
        })
    })

    before("start rethinkdb service", function(done)
    {
        runContainer("rethinkdb", "latest", "rethinkdb").then(function(id)
        {
            global.rdb_id = id

            checkService(
                url.parse(process.env.DOCKER_HOST).hostname,
                config.database.port).then(function()
            {
                    done()
                }, function(error)
            {
                    done(new Error("failed starting rethinkdb: " + error.toString()))
                })
        }, function(error)
        {
            done(error)
        })
    })

    // main/developed service
    before("start microservice", function(done)
    {
        const cmd = `ps x | fgrep 'node ${pkg.main}' | fgrep -v 'fgrep' | wc -l | awk '{$1=$1};1'`

        exec(cmd, function(error, out)
        {
            if (error)
                return done(error)

            if (out != 0)
                return done()

            const options = []

            if (os.platform() === "darwin")
            {
                options.push("--service-bus-hostname", url.parse(process.env.DOCKER_HOST).hostname)
                options.push("--database-hostname", url.parse(process.env.DOCKER_HOST).hostname)
            }

            app = fork(pkg.main, options,
                {
                    silent: true
                })

            app.stdout.on("data", function(data)
            {
                let message = null

                try
                {
                    message = JSON.parse(data.toString()).message
                }
                catch (error)
                {
                    // ignore messages other than JSON
                }

                if (message === "_app_ready")
                {
                    return done()
                }

                console.log("  @ npm test debugging output:", message)
            })

            app.stderr.on("data", function(data)
            {
                console.log("  @ stderr from an app:\n\n", data.toString())
            })

            app.on("error", function(error)
            {
                done(error)
            })

            app.on("close", global.closeHandler)
        })
    })

    it("done", function(done)
    {
        done()
    })

    /* implement this once we solve nats persistency
    it("should get application logs", function(done)
    {
        let c = nats.connect(url.format(
        {
            protocol: config.service_bus.protocol,
            port: config.service_bus.port,
            hostname: config.service_bus.hostname,
            slashes: true
        }))

        let sid = c.subscribe(config.service_bus.queues.logs.subject, function(message) {
            c.unsubscribe(sid)
        })
    })
    */
})

/**
 * Runs a Docker container.
 * @param {String} image_name - Name of the Docker image
 * @param {String} tag - Docker image tag
 * @param {String} container_name - Name of the created Docker container
 * @return {Promise}
 */
function runContainer(image_name, tag, container_name)
{
    const image_tag = image_name + ":" + tag

    return new Promise(function(resolve, reject)
    {
        docker.listContainers(function(error, containers)
        {
            if (error)
                return reject(error)

            for (const container of containers)
            {
                // if the same image is already instantiated, don't run it
                if (container.Names[0].indexOf(image_name) !== -1 || container.Image === image_tag)
                    return resolve()
            }

            docker.listImages(function(error, list)
            {
                if (error)
                    return reject(error)

                for (let i = 0, len = list.length ;i < len ;i++)
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

            /**
             * Fetches a Docker image.
             * @return {Promise}
             */
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

            /**
             * Starts a Docker image.
             * @return {Promise}
             */
            function startImage()
            {
                return new Promise(function(resolve, reject)
                {
                    const image = docker.getImage(image_name)

                    image.inspect(function(error, data)
                    {
                        if (error)
                            return reject(error)

                        const bindings = {
                            PortBindings:
                            {}
                        }

                        for (const port of Object.keys(data.ContainerConfig.ExposedPorts))
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

                            container.start(function(error)
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

/**
 * Checks if service port is opened.
 * @param {String} host - Service hostname
 * @param {Number} port - Service port
 * @return {Promise}
 */
function checkService(host, port)
{
    return new Promise(function(resolve, reject)
    {
        let check = 0

        const connect = function()
        {
            const sock = new net.Socket()

            sock.connect(
                {
                    host: host,
                    port: port
                }, function()
            {
                resolve()
            })

            sock.once("error", function(error)
            {
                if (error.code === "ECONNREFUSED" && check >= 5)
                    reject(error)
            })

            sock.once("close", function()
            {
                if (check < 5)
                {
                    check++
                    setTimeout(connect, 1000)
                    return
                }

                reject()
            })
        }

        connect()
    })
}

/**
 * A global application exit method.
 * @return {Undefined}
 */

global.closeHandler = function()
{
    console.log(new Error("app closed prematurely"))
    process.exit(1)
}
