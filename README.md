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

Change the parameter of the file accordingly on `NETWORK` and `LOOKUP_ENDPOINT` variables using one of the following network values: `regtest`, `testnet`, `mainnet`.

### Install Dependencies

```sh
$ npm install
```

## Running

<br />

### Docker Compose

To enable API caching spin up `redis` via `docker-compose`.

```sh
$ docker-compose up -d
```

### Start API

```sh
$ npm start
```

## Release

To cut a new release from main, use the github release functionality. This will automatically build and deploy to our EC2 instance.

### Issues

If there are issues with the deployment `ssh` into the EC2 instance @ 52.63.33.11 to troubleshoot. Please not the following EC2 setup we are using for where to begin.

#### NGINX

We are currently using NGINX to route incoming api request to the locally running server instance. The NGINX config can be found under the home folder `/home/ubuntu/nginx/nginx.conf`.

If updates are needed to the NGINX config, please make the changes and restart the NGINX service.

Check the NGINX status:

```sh
$ sudo systemctl status nginx
```

If needed start the NGINX process:

```sh
$ sudo systemctl start nginx
```

Or restart the NGINX process:

```sh
$ sudo systemctl reload nginx
```

#### PM2

We are currently running the API through [PM2](https://pm2.keymetrics.io/) to ensure the process is always running. The service should be running under `sado-api` which our automatic deployment targets when restarting the api instance after `dist` updates.
