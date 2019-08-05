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
    msg.author.send(`Use the following link to invite RoVer: <${config.invite}>`).then(() => {
      msg.reply('Sent you a DM with information.')
    }).catch(() => {
      msg.reply('I can\'t seem to message you - please make sure your DMs are enabled!')
    })
  }
}
