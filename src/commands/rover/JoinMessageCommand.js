const Command = require('../Command')

module.exports =
class JoinMessageCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'joindm',
      properName: 'JoinDM',
      aliases: ['roverjoindm'],
      description: '`<on|off>` Set whether or not new users will be automatically direct messaged when joining this server. Default on',

      args: [
        {
          key: 'state',
          label: 'state',
          prompt: 'Should users get direct messaged with your welcome message or verification instructions when they join this server? (on|off)',
          type: 'boolean'
        }
      ]
    })
  }

  async fn (msg, args) {
    if (this.server.ongoingSettingsUpdate) return msg.reply('Server settings are currently being saved - please try again in a few moments.')
    this.server.setSetting('joinDM', args.state)
    if (args.state) {
      msg.reply('The bot will now direct message new users with the welcome message or verification instructions.')
    } else {
      msg.reply('The bot will no longer direct message new users with the welcome message or verification instructions.')
    }
  }
}
