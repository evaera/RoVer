const Command = require('../Command')

module.exports =
class NicknameGroupCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'nicknamegroup',
      properName: 'NicknameGroup',
      aliases: ['rovernicknamegroup'],
      description: "`<groupid>` Set the Group RoVer will use when setting users' nicknames.",

      args: [
        {
          key: 'groupid',
          label: 'groupid',
          prompt: 'Nickname group',
          type: 'string',
          infinite: true
        }
      ]
    })
  }

  async fn (msg, args) {
    if (args.groupid) {
      this.server.setSetting('nicknameGroup', args.groupid)
      msg.reply(`Set nickname group to \`${args.groupid}\``)
    } else {
      this.server.setSetting('nicknameGroup', undefined)
      msg.reply('Nickname group has been set to null.')
    }
  }
}
