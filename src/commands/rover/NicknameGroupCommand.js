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
          infinite: false
        }
      ]
    })
  }

  async fn (msg, args) {
    let groupId = args.groupid
    if (groupId) {
      if (groupId.match(/^\d+$/)) {
        this.server.setSetting('nicknameGroup', args.groupid)
        msg.reply(`Set nickname group to \`${args.groupid}\``)
      } else {
        console.log('NOPE')
        msg.reply(`:no_entry_sign: You have attempted to bind an invalid group. Possible causes:\n\n- You forgot to put the Discord role name in quotation marks when it has spaces\n- You have attempted to bind an invalid group id. Group IDs must be a whole number or be a valid VirtualGroup name.`)
      }
      // this.server.setSetting('nicknameGroup', args.groupid)
      // msg.reply(`Set nickname group to \`${args.groupid}\``)
    } else {
      this.server.setSetting('nicknameGroup', undefined)
      msg.reply('Nickname group has been removed.')
    }
  }
}
