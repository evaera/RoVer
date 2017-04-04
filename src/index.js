const DiscordBot    = require('./DiscordBot')
const config        = require('./data/client.json')

let discordBot = new DiscordBot();

if (config.updateServer) {
    require('./UpdateServer.js')(discordBot, config.updateServer);
}