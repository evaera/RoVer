const Accolades = require('../../Accolades.json')
const Command = require('../Command')
const { ShardClientUtil } = require('discord.js')

module.exports =
class RestartCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'restart',
      properName: 'Restart',
      description: 'Restarts bot process',
      userPermissions: [],
      args: [
        {
          key: 'server',
          label: 'server',
          prompt: 'Server ID?',
          type: 'string',
          default: false
        }
      ]
    })
  }

  hasPermission (msg) {
    return this.client.isOwner(msg.author) || (Accolades[msg.author.id] && Accolades[msg.author.id].match('Support Staff'))
  }

  async fn (msg, args) {
    if (!args.server) {
      await msg.reply('Restarting...')
      process.exit()
    }
    if(isNaN(args.server)) return msg.reply("An invalid server id was given!")
    const shard = Discord.ShardClientUtil.shardIDForGuildID(args.server, msg.client.shard.count)
    // Zero is falsy so we don't want that to prevent restarts from working
    if (!shard && shard !== 0) return
    await msg.reply(`Restarting shard ${shard}!`)
    msg.client.shard.broadcastEval('process.exit()', shard)
  }
}
