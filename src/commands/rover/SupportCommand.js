const Command = require('../Command')

module.exports =
class SupportServerCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'support',
      properName: 'Support',
      aliases: ['server'],
      userPermissions: [],
      description: 'Posts an invite link to the Official RoVer Discord where you can easily get help.'
    })
  }

  async fn (msg) {
    msg.author.send('Having trouble? You can join our official support discord here: discord.gg/7yfwrat, or you can check out the documentation here: https://rover.link/#readme').then(() => {
      msg.reply('Sent you a DM with information.')
    }).catch(() => {
      msg.reply('I can\'t seem to message you - please make sure your DMs are enabled!')
    })
  }
}
