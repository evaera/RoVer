const Command = require('../Command')

module.exports =
class AnnounceChannelCommand extends Command {
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
    msg.reply('The invite URL to the Official RoVer Discord is: discord.gg/UgrYcCS')
  }
}
