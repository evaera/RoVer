const Command = require('../Command')

module.exports =
class VerifyChannelCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'verifychannel',
      properName: 'VerifyChannel',
      aliases: ['roververifychannel', 'verificationchannel'],
      description: '`<Discord Channel>` Set a channel that the bot will delete all messages in except for verification messages. Default none.',

      args: [
        {
          key: 'channel',
          label: 'channel',
          prompt: 'What channel will users run the verify command in?',
          type: 'channel',
          default: false
        }
      ]
    })
  }

  async fn (msg, args) {
    if (this.server.ongoingSettingsUpdate) return msg.reply('Server settings are currently being saved - please try again in a few moments.')
    const channel = args.channel

    if (channel) {
      this.server.setSetting('verifyChannel', channel.id)
      msg.reply(`Set verify channel to ${channel}. Non-verification messages in this channel will be deleted.`)
    } else {
      this.server.setSetting('verifyChannel', null)
      msg.reply('Removed verification channel. All messages are allowed to be sent in that channel now.')
    }
  }
}
