const Command = require('../Command')

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

    let server = await this.discordBot.getServer(msg.guild.id)
    let member = await server.getMember(msg.author.id)

    if (!member) {
      return msg.reply('User not in guild.')
    }

    member.verify({ message: msg })
  }
}
