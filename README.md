# SADO Orderbook API

## Setup

### Prerequisites

Make sure you have these installed on your local machine:

- [Docker](https://docs.docker.com/engine/install/)
- [Git](https://github.com/git-guides/install-git)

### Configuration

1. Create `.env` environment file

```sh
# Make sure you are in the project directory
$ cp dotenv .env
```

2. Change the parameter of the file accordingly on `NETWORK` and `LOOKUP_ENDPOINT`

> `Regtest`: `regtest`
>
> `Testnet`: `testnet`
>
> `Mainnet`: `mainnet`

<br>

3. Install packages

```sh
$ npm install
```

<br>

4. To enable caching, install `Redis`, on Ubuntu

```sh
$ sudo apt update && sudo apt install redis
```

<br>

## Running

1. Start the application

```sh
$ npm start
```

> For production, create a `systemd` file
