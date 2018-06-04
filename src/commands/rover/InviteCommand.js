const Command = require('../Command')
const config = require('../../data/client.json')

module.exports =
class InviteCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'invite',
      properName: 'Invite',
      aliases: ['roverinvite'],
      description: 'Sends the user an invite link to invite RoVer.',
      userPermissions: []
    })
  }

  async fn (msg) {
    msg.direct(`Use the following link to invite RoVer: <${config.invite}>`)
    return msg.reply('Sent you a DM with information.')
  }
}
