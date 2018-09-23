<p align="center">
    <a href="https://eryn.io/RoVer/"><img src="/assets/Logo_Text.svg" alt="RoVer" height="150" /></a>
</p>

<p align="center">
    <a href="https://discordapp.com/oauth2/authorize?client_id=298796807323123712&scope=bot&permissions=402656264"><img src="/assets/Add_RoVer.png" alt="Add" /></a>
</p>

[![Patreon](http://i.imgur.com/dujYlAK.png)](https://www.patreon.com/erynlynn) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com) [![Verified Users](https://img.shields.io/badge/verified%20users-650K%2B-brightgreen.svg)](https://eryn.io/RoVer) [![Discord Servers](https://img.shields.io/badge/total%20servers-45K%2B-brightgreen.svg)](https://eryn.io/RoVer)
[![Discord](https://img.shields.io/discord/425800792679645204.svg)](https://discord.gg/7yfwrat)

<h1 align="center"><a href="https://rover.link/#readme">Documentation can be found on the RoVer website</a></h1>

## Self-hosting instructions
Self-hosting is recommended for advanced users only who are experienced with the Node.js ecosystem. Note that setup or code support will not be given for attempting to run your own instance of RoVer, modified or otherwise.

1. To get RoVer ready to run locally, the first step is to clone this repository onto the machine you wish to run it on.
2. **Node.js version 8.9.4 LTS or newer is recommended to run RoVer.**
3. [Install yarn](https://yarnpkg.com/lang/en/docs/install/) if you don't already have it
4. Use yarn to install the dependencies from the project folder: `yarn install`
5. Edit the file `src/data/client.json` and insert your [bot token](https://discordapp.com/developers/applications/me).
6. Start the bot from the project folder: `node ./src/index.js`
7. You should set up a process manager like [PM2](http://pm2.keymetrics.io/) or forever.js to ensure that the bot remains online.

### Update Server

The *Update Server* is an optional part of RoVer that can be enabled in `client.json`. It is an HTTP server that can listen for requests and globally update a member in all guilds that the bot is in, similar to if they ran `!verify` in every guild. This is used internally on the hosted version for when the user verifies on verify.eryn.io, but you could use it for whatever purpose you wish.

### client.json options

```
    "token"             : String. The bot token that is used to log in to your bot.
    "lockNicknames"     : Boolean. Default false. If true, the bot will run DiscordServer.verifyMember every time
                          they begin typing. This will quickly eat up API requests if you aren't careful. Mostly
                          used on the hosted version.
    "updateServer"      : {
                          If this object is present, the update server will be started.

        "port"          : Integer. The port the Update server runs on.
        "apiKey"        : String. The API key the server checks against before updating the user.
    }
    "loud"              : Boolean. Default false. Logs every request made to stdout.
    "totalShards"       : Integer. Default auto. The number of shards to launch.
    "apiRequestMethod"  : String. Default 'sequential'. sequential' or 'burst'. Sequential executes all requests in the order
                          they are triggered, whereas burst runs multiple at a time, and doesn't guarantee a particular order.
    "owner"             : String. Default "0". The Discord ID of the bot's owner.
    "commandPrefix"     : String. Default "!". The prefix for commands.
    "shardLifeTime"     : Integer. Number of seconds each shard will run before closing.
    "mainLifeTime"      : Integer. Number of seconds the main process will run before closing. (Need a process manager if you want it to relaunch)
```
