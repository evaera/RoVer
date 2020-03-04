const Command = require('../Command')
const request = require('request-promise')

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
          type: 'integer',
          infinite: false,
          default: 0
        }
      ]
    })
  }

  async fn (msg, args) {
    if (this.server.ongoingSettingsUpdate) return msg.reply('Server settings are currently being saved - please try again in a few moments.')
    if (args.groupid) {
      const data = await request({
        uri: `https://groups.roblox.com/v1/groups/${args.groupid}`,
        json: true,
        simple: false
      })

      if (data.errors && data.errors[0].code === 1) { // ensure group exists - error code 1 is "Group is invalid or does not exist."
        return msg.reply('There was a problem looking up the group you provided.')
      }

      this.server.setSetting('nicknameGroup', args.groupid)
      msg.reply(`Set nickname group to \`${args.groupid}\``)
    } else {
      this.server.setSetting('nicknameGroup', undefined)
      msg.reply('Nickname group has been removed.')
    }
  }
}
