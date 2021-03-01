const Accolades = require('../../Accolades.json')
const Command = require('../Command')

module.exports =
class RestartCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'restart',
      properName: 'Restart',
      description: 'Restarts bot process',
      userPermissions: []
    })
  }

  hasPermission (msg) {
    return this.client.isOwner(msg.author) || (Accolades[msg.author.id] && Accolades[msg.author.id].match('Support Staff'))
  }

  async fn (msg) {
    await msg.reply('Restarting...')
    process.exit()
  }
}
