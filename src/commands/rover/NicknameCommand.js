const Command = require('../Command')

module.exports =
class NicknameCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'nickname',
      properName: 'Nickname',
      aliases: ['rovernickname'],
      description: '`<on|off>` Set whether or not new users will be nicknamed to their Roblox name. Default on',

      args: [
        {
          key: 'state',
          label: 'state',
          prompt: 'Should verified members get nicknamed? (on|off)',
          type: 'boolean'
        }
      ]
    })
  }

  async fn (msg, args) {
    if (this.server.ongoingSettingsUpdate) return msg.reply('Server settings are currently being saved - please try again in a few moments.')
    this.server.setSetting('nicknameUsers', args.state)
    if (args.state) {
      msg.reply('The bot will now nickname users to their Roblox username.')
    } else {
      msg.reply('The bot will no longer nickname users to their Roblox name.')
    }
  }
}
