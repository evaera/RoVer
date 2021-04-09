const Accolades = require('../../Accolades.json')
const Command = require('../Command')

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
    const shard = msg.client.shard.shardIDForGuildID(msg.guild.id, msg.client.shard.count).catch(() => {
      msg.reply('An invalid server id was given!')
    })
    // Zero is falsy so we don't want that to prevent restarts from working
    if (!shard && shard !== 0) return
    await msg.reply(`Restarting shard ${shard}!`)
    msg.client.shard.broadcastEval('process.exit()', shard)
  }
}
