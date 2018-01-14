const Command = require('../Command')

module.exports =
class NicknameFormatCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'nicknameformat',
      properName: 'NicknameFormat',
      aliases: ['rovernicknameformat'],
      description: "`<format>` Set the format RoVer will use when setting users' nicknames. Available replacements are %USERNAME%, %USERID%, %SERVER%, %DISCORDNAME%, and %DISCORDID%. Example:` %USERNAME% - (%USERID%)`. Default `%USERNAME%`.",

      args: [
        {
          key: 'format',
          label: 'format',
          prompt: 'Nickname format',
          type: 'string',
          infinite: true,
          default: false
        }
      ]
    })
  }

  async fn (msg, args) {
    if (args.format) {
      args.format = args.format.join(' ')
      this.server.setSetting('nicknameFormat', args.format)
      msg.reply(`Set nickname format to \`${args.format}\``)
    } else {
      this.server.setSetting('nicknameFormat', undefined)
      msg.reply('Nickname format set back to default')
    }
  }
}
