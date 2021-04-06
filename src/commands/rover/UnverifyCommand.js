const Command = require('../Command')

module.exports =
class UnverifyCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'unverify',
      properName: 'Unverify',
      aliases: ['unlink'],
      userPermissions: []
    })
  }

  async fn (msg) {
    msg.author.send('To unverify, please contact a moderator or above at our support server:').then(() => {
      msg.reply('Sent you a DM with information.')
    }).catch(() => {
      msg.reply('I can\'t seem to message you - please make sure your DMs are enabled!')
    })
  }
}
