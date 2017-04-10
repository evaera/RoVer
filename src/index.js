// This file is the entry point for the bot.

const DiscordBot    = require('./DiscordBot')
const config        = require('./data/client.json')

// Start the actual bot
let discordBot = new DiscordBot();

// If updateServer is defined, start that up as well.
if (config.updateServer) {
    require('./UpdateServer.js')(discordBot, config.updateServer);
}

// client.json documentation:
/*
    "token"         : String. The bot token that is used to log in to your bot.
    "lockNicknames" : Boolean. Default false. If true, the bot will run DiscordServer.verifyMember every time
                      they begin typing. This will quickly eat up API requests if you aren't careful. Mostly
                      used on the hosted version.
    "updateServer"  : {
                      If this object is present, the update server will be started.
                      
        "port"      : The port the Update server runs on.
        "apiKey"    : The API key the server checks against before updating the user.
    }
*/