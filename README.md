# scrutiny-gui-webapp

Scrutiny GUI client web application

## Roadmap

Initial Release : https://github.com/scrutinydebugger/scrutiny-gui-webapp/projects/1

## Quick Start

1. Install the following requirements

-   Docker Desktop
-   Node Version Manager (nvm)
-   vscode

2. Run the following command to initialize your cloned repo

```bash
# Install and use proper node js version
nvm install
nvm use

# install dependencies
npm install

# init dev server
cd dev
docker-compose up -d server
bash scripts/launch-tagged-embedded.sh
```

3. Launch a vscode Debug session (F5) using "Debug Scrutiny UI with Chrome"
