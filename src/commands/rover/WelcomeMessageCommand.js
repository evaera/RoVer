const Command = require('../Command')

module.exports =
class WelcomeMessageCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'welcomemessage',
      properName: 'WelcomeMessage',
      aliases: ['roverwelcomemessage'],
      description: '`<Message>` Set the message the user gets when they join your server. This is only shown to verified members. Available replacements are %USERNAME%, %USERID%, %SERVER%, %DISCORDNAME%, and %DISCORDID%. Default: Welcome to %SERVER%, %USERNAME%!.',

      args: [
        {
          key: 'message',
          label: 'message',
          prompt: 'Welcome message',
          type: 'string',
          default: false,
          optional: true
        }
      ]
    })
  }

  async fn (msg, args) {
    if (this.server.ongoingSettingsUpdate) return msg.reply('Server settings are currently being saved - please try again in a few moments.')
    if (args.message) {
      this.server.setSetting('welcomeMessage', args.message)
      msg.reply(`Set welcome message to \`${args.message}\``)
    } else {
      this.server.setSetting('welcomeMessage', undefined)
      msg.reply('Set welcome message back to default')
    }
  }
}
