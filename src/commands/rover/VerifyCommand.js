const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')

module.exports =
class VerifyCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'verify',
      properName: 'Verify',
      aliases: ['getroles', 'getrole'],
      userPermissions: [],
      description: "Update the sender's roles and nickname."
    })
  }

  async fn (msg) {
    // The user ran `!verify`, we are checking their status now.

    // Clear the request cache so we get fresh information.
    await DiscordServer.clearMemberCache(msg.author.id)

    let server = await this.discordBot.getServer(msg.guild.id)
    let member = await server.getMember(msg.author.id)

    if (!member) {
      return msg.reply('User not in guild.')
    }

    member.verify({ message: msg })
  }
}
