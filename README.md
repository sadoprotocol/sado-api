# SADO Orderbook API

A orderbook provider API for self-authenticating decentralized (interplanetary) ordinalbooks. It aims to provide a simple and easy to use API for developers to integrate with bitcoin ordinals.

## Setup

### Prerequisites

Make sure you have the following services installed in your local environment.

| Service | Instructions                              |
| ------- | ----------------------------------------- |
| Docker  | https://docs.docker.com/engine/install    |
| Git     | https://github.com/git-guides/install-git |

### Configuration

Create `.env` environment file by copying the `dotenv` file from the project directory.

```sh
$ cp dotenv .env
```

Open the `.env` file and adjust configuration as needed for your local setup. By default the values in the base file should work out of the box unless you manually adjust the environment.

### Install Dependencies

```sh
$ npm install
```

## Local Development

Running the solution locally for development purposes we use docker to spin up our required services.

### Docker Compose

Before starting local instance we need to spin up `redis` for the orderbook monitor, and `mongodb` for our orderbook stores using `docker-compose`.

```sh
$ docker-compose up -d
```

### Start the API

Once the docker containers are up and running we can start the API.

```sh
$ npm start
```

Currently the orderbook resolver loop goes through a cron job worker, for local development purposes you can run the worker manually to update the orderbooks on the latest blockchain state.

```sh
$ npm run worker
```

## Docker

For future release purposes we can build a new docker image with the latest version of our application that can then be deployed to any docker capable service.

```sh
$ docker build -t sadoprotocol/api:0.0.0 .
```

Then run the container.

```sh
$ docker run --name sado-api --env-file .env -p 3030:3030 -d sadoprotocol/api:0.0.0
```

For the docker container to have access to the localhost services running outside the container you should use the `host.docker.internal` hostname for the endpoints.

An example with the current dotenv configuration.

```
MONGODB_URI=mongodb://host.docker.internal:27017
```
