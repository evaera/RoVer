const Commando = require('discord.js-commando')

module.exports =
class Command extends Commando.Command {
  constructor (client, info) {
    info.group = 'rover'
    info.guildOnly = true
    info.memberName = info.name

    super(client, info)

    this.properName = info.properName
    this.userPermissions = info.userPermissions || ['MANAGE_GUILD']
    this.discordBot = this.client.discordBot
  }

  hasPermission (msg) {
    return msg.member.hasPermission(this.userPermissions)
  }

  async run (msg, args, pattern) {
    this.server = await this.discordBot.getServer(msg.guild.id)
    return this.fn(msg, args, pattern)
  }
}
