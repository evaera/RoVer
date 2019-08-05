const Command = require('../Command')

module.exports =
class NicknameFormatCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'nicknameformat',
      properName: 'NicknameFormat',
      aliases: ['rovernicknameformat'],
      description: "`<format>` Set the format RoVer will use when setting users' nicknames. Available replacements are %USERNAME%, %RANK%, %USERID%, %SERVER%, %DISCORDNAME%, and %DISCORDID%. Example:` %USERNAME% - (%USERID%)`. Default `%USERNAME%`.",

      args: [
        {
          key: 'format',
          label: 'format',
          prompt: 'Nickname format',
          type: 'string',
          infinite: false,
          default: false
        }
      ]
    })
  }

  async fn (msg, args) {
    if (this.server.ongoingSettingsUpdate) return msg.reply('Server settings are currently being saved - please try again in a few moments.')
    if (args.format) {
      this.server.setSetting('nicknameFormat', args.format)
      msg.reply(`Set nickname format to \`${args.format}\``)
    } else {
      this.server.setSetting('nicknameFormat', undefined)
      msg.reply('Nickname format set back to default')
    }
  }
}
