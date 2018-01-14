const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')

module.exports =
class UpdateCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'update',
      properName: 'Update',
      aliases: ['roverupdate'],
      description: '`<Discord User>` Forcibly update verification status of a user, same as them running !verify. Make sure you @mention the user.',

      args: [
        {
          key: 'user',
          prompt: 'User to update',
          type: 'user'
        }
      ]
    })
  }

  async fn (msg, args) {
    let user = args.user
    DiscordServer.clearMemberCache(user.id)

    let server = await this.discordBot.getServer(msg.guild.id)
    let member = await server.getMember(user.id)

    if (!member) {
      return msg.reply('User not in guild.')
    }

    member.verify({ message: msg, skipWelcomeMessage: true })
  }
}
