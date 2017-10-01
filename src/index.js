// This file is the entry point for the bot.

const path = require('path')
const Discord = require('discord.js')
const {GlobalCache} = require('./GlobalCache')
const config = require('./data/client.json')
const updateServer = require('./UpdateServer.js')

// Set up the sharding manager, a helper class that separates handling
// guilds into grouped processes called Shards.
let shardingManager = new Discord.ShardingManager(path.join(__dirname, 'Shard.js'), {
  token: config.token,
  totalShards: config.totalShards || 'auto'
})

shardingManager.on('launch', shard => {
  console.log(`Launching shard ${shard.id + 1}/${shardingManager.totalShards}`)
})

shardingManager.spawn()

// Instantiate a GlobalCache, which will cache information from the shards.
global.GlobalCache = new GlobalCache(shardingManager)

// If updateServer is defined, start that up as well.
if (config.updateServer) {
  updateServer(shardingManager, config.updateServer)
}

if (config.mainLifeTime) {
  setTimeout(() => {
    shardingManager.respawn = false
    shardingManager.broadcastEval('process.exit()')
  }, config.mainLifeTime * 1000)

  setTimeout(() => {
    process.exit()
  }, (config.mainLifeTime + 5) * 1000)
}

// Client.json documentation:
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
    "owner"             : String. Default "0". The Discord ID of the bot's owner.
    "commandPrefix"     : String. Default "!". The prefix for commands.
    "shardLifeTime"     : Integer. Number of seconds each shard will run before closing.
    "mainLifeTime"      : Integer. Number of seconds the main process will run before closing.
*/

/**
 * @typedef Snowflake
 * @see {@link https://discord.js.org/#/docs/main/master/typedef/Snowflake}
 */

/**
 * @typedef GuildMember
 * @see https://discord.js.org/#/docs/main/master/class/GuildMember
 */

/**
 * @typedef Message
 * @see https://discord.js.org/#/docs/main/master/class/Message
 */
