# SADO Orderbook API

A orderbook provider API for self-authenticating decentralized (interplanetary) ordinalbooks. It aims to provide a simple and easy to use API for developers to integrate with bitcoin ordinals.

<br />

## Setup

<br />

### Prerequisites

Make sure you have the following services installed in your local environment.

| Service | Instructions                              |
| ------- | ----------------------------------------- |
| Docker  | https://docs.docker.com/engine/install    |
| Git     | https://github.com/git-guides/install-git |

<br />

### Configuration

Create `.env` environment file by copying the `dotenv` file from the project directory.

```sh
$ cp dotenv .env
```

Change the parameter of the file accordingly on `NETWORK` and `LOOKUP_ENDPOINT` variables using one of the following network values: `regtest`, `testnet`, `mainnet`.

<br />

### Install Dependencies

```sh
$ npm install
```

<br />

## Running

<br />

### Docker Compose

To enable API caching spin up `redis` via `docker-compose`.

```sh
$ docker-compose up -d
```

<br />

### Start API

```sh
$ npm start
```
