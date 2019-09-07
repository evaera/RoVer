const Command = require('../Command')
const fs = require('mz/fs')
const path = require('path')

module.exports =
class TransferPlus extends Command {
  constructor (client) {
    super(client, {
      name: 'transferplus',
      properName: 'Transfer Plus',
      description: 'Transfer RoVer Plus ownership to someone else',
      userPermissions: [],
      guildOnly: false,

      args: [
        {
          key: 'user',
          label: 'user',
          type: 'string',
          prompt: 'User:'
        }
      ]
    })
  }

  async fn (msg, args) {
    if (!this.discordBot.isPremium()) {
      return msg.reply('This command can only be run on RoVer Plus!')
    }

    if (!args.user.match(/^\d+$/)) {
      return msg.reply('Invalid user ID! To grab a user ID, you must enable Discord settings > Appearance > Developer Mode, then right-click on any user in Discord and click "Copy ID')
    }

    fs.appendFile(
      path.join(__dirname, '../../data/transfers.csv'),
      [msg.author.id, args.user].join() + '\n'
    )

    this.discordBot.patronTransfers[msg.author.id] = args.user

    this.discordBot.updatePatrons()

    return msg.reply(`Your RoVer Plus access has been transferred to user ${args.user}! If you wish to take access back yourself, just run the transfer command with yourself as the user.`)
  }
}
