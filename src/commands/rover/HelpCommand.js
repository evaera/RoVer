const Command = require('../Command')

module.exports =
class HelpCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'roverhelp',
      properName: 'RoVer',
      aliases: ['rover'],
      description: 'Displays a list of commands'
    })
  }

  async fn (msg) {
    let commandGroup = this.client.registry.groups.get('rover')
    let lines = commandGroup.commands.map(cmd => `**${msg.guild.commandPrefix}${cmd.properName}** ${cmd.description}`).join('\n\n').split('\n')
    let output = `Welcome to RoVer, a bot that makes integrating your server with Roblox easy. If you need help, you can join our support server by using the ${msg.guild.commandPrefix}support command.\n\n`
    for (let line of lines) {
      if (output.length + line.length > 1900) {
        msg.reply(output)
        output = ''
      }

      output += line + '\n'
    }

    msg.reply(output)
  }
}
