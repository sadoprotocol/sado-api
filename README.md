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

## Running

### Docker Compose

Before starting local instance we need to spin up `redis` for the orderbook monitor, and `mongodb` for our orderbook stores using `docker-compose`.

```sh
$ docker-compose up -d
```

### Start the API

```sh
$ npm start
```
