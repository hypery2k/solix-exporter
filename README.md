# Solix Prometheus Exporter



[![License](https://img.shields.io/github/license/hypery2k/solix-exporter.svg)](LICENSE)
[![CI](https://github.com/hypery2k/solix-exporter/actions/workflows/build.yml/badge.svg)](https://github.com/hypery2k/solix-exporter/actions/workflows/build.yml)
[![Docker Stars](https://img.shields.io/docker/stars/hypery2k/solix-exporter.svg)](https://hub.docker.com/r/hypery2k/solix-exporter/)

Exporter to poll data for an Anker SOLIX Solarbank E1600 Balcony Power Storage and publish it as Prometheus Stats.

## Description
This is a thin bridge between the API used by the Anker App and Prometheus. Based on [solix2mqtt](https://github.com/hypery2k/solix-exporter)

## Prerequisites

Before you begin, ensure you have met the following requirements:

### Software
- **[Node.js](https://nodejs.org/)**: You will need Node.js to run this project. Download and install it from [nodejs.org](https://nodejs.org/).
- **[npm](https://www.npmjs.com/)**: This project uses npm for dependency management. It is included with the Node.js installation.

### Setup
1. **Clone the repository**: Clone this repository to your local machine using `git clone https://github.com/hypery2k/solix-exporter.git`.
2. **Navigate to the project directory**: `cd solix2mqtt`.
3. **Install dependencies**: Run `npm install` to install all the project dependencies.

With these steps, you will have set up the necessary environment to run and use `solix2mqtt`.

## Usage
### Locally
```bash
npm install && npm run build
  ANKER_USERNAME=*** \
  ANKER_PASSWORD=*** \
  ANKER_COUNTRY=DE \
  DEVICE_SN=A****** \
  npm run start
```

### Docker
```bash
docker run -d \
  -e ANKER_USERNAME=*** \
  -e ANKER_PASSWORD=*** \
  -e ANKER_COUNTRY=DE \
  -e DEVICE_SN=A****** \
  -p 3000:3000
  hypery2k/solix-exporter:latest
```

## Configuration
The app can be configured using the following environment variables:

- `ANKER_USERNAME` (required): Email address of your Anker account
- `ANKER_PASSWORD` (required): Password of your Anker account
- `ANKER_COUNTRY` (required): A two-letter country code (e.g. `DE`)
- `DEVICE_SN` (required): Device S/N
- `LOG_VERBOSE` (optional): Set to true for more logs (default: `false``)

## Auth

The App utilizes an advanced version of the auth mechanism known from Eufy. The Anker App employs a two-step authentication scheme: first, keys are exchanged, and second, the full login payload is encrypted. However, it turns out the original Eufy mechanism still works, so we're using that in this project (credits to [eufy-security-client](https://github.com/bropat/eufy-security-client) for inspiration). This might break at some point!

For a "READ-ONLY" access to the data, an account with which the "System" has been shared can be used. By this the main account can still be used in the app to control everything and the shared account can be used for the API access.

**Note**: Anker currently permits only one simultaneous login at a time. When you log in from another device, all previously generated auth tokens become invalidated.

## Disclaimer
This project is the result of some work I did to integrate my Solix into my home automation. I no longer own an Anker Solix Solarbank due to disappointment with the product, so this project will not receive any updates. However, I'm happy to accept pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgements
- [solix2mqtt](https://github.com/SteiniZuHaus/Solix2)
- [eufy-security-client](https://github.com/bropat/eufy-security-client)
