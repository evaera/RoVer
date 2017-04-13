// This file is the entry point for the bot.

const Discord       = require('discord.js')
const config        = require('./data/client.json')

// Set up the sharding manager, a helper class that separates handling
// guilds into grouped processes called Shards. 
let shardingManager = new Discord.ShardingManager('DiscordBot.js', {
    token: config.token,
    totalShards: config.totalShards || 'auto'
});

shardingManager.on('launch', shard => {
    console.log(`Launching shard ${shard.id + 1}/${shardingManager.totalShards}`);
});

shardingManager.spawn();

// If updateServer is defined, start that up as well.
if (config.updateServer) {
    require('./UpdateServer.js')(shardingManager, config.updateServer);
}

// client.json documentation:
/*
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
*/