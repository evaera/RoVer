// This file is the entry point for Shard processes.

const config = require('./data/client.json')
const DiscordBot = require('./DiscordBot')

// Instantiate the bot.
const discordBot = new DiscordBot()

// Listen for when we need to globally update a member
// from the Update Server.
process.on('message', msg => {
  if (msg.action === 'globallyUpdateMember') {
    discordBot.globallyUpdateMember(msg.argument)
  } else if (msg.action === 'status') {
    discordBot.setActivity(msg.argument.text, msg.argument.type)
  }
})

// Max shard life time
if (config.shardLifeTime) {
  setTimeout(() => {
    process.exit()
  }, config.shardLifeTime * 1000)
}
