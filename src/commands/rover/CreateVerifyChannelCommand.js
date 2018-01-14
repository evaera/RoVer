const Command = require('../Command')
const Util = require('../../Util')

module.exports =
class CreateVerifyChannelCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'createverifychannel',
      properName: 'CreateVerifyChannel',
      aliases: ['rovercreateverifychannel', 'createverify', 'createverificationchannel', 'createverification'],
      description: 'Creates a channel category with verification instructions for new members and a channel for users to verify themselves'
    })
  }

  async fn (msg) {
    let category = await msg.guild.channels.create('Verification', {
      type: 'category',
      reason: `${msg.member.displayName} ran CreateVerifyChannel command`
    })

    let overwritesInstructions = []
    let overwritesVerify = []

    for (let role of msg.guild.roles.array()) {
      overwritesInstructions.push({
        id: role,
        allow: ['READ_MESSAGE_HISTORY', 'VIEW_CHANNEL'],
        deny: ['SEND_MESSAGES', 'ADD_REACTIONS']
      })

      overwritesVerify.push({
        id: role,
        allow: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
        deny: ['READ_MESSAGE_HISTORY']
      })
    }

    let instructionsChannel = await msg.guild.channels.create('verify-instructions', {
      type: 'text',
      parent: category,
      reason: `${msg.member.displayName} ran CreateVerifyChannel command`,
      overwrites: overwritesInstructions
    })

    let verifyChannel = await msg.guild.channels.create('verify', {
      type: 'text',
      parent: category,
      reason: `${msg.member.displayName} ran CreateVerifyChannel command`,
      overwrites: overwritesVerify
    })

    this.server.setSetting('verifyChannel', verifyChannel.id)

    instructionsChannel.send(`This server uses a Roblox verification system. In order to unlock all the features of this server, you'll need to verify your Roblox account with your Discord account!\n\nVisit ${Util.getVerifyLink(msg.guild)} and follow the instructions. Then, say \`${msg.guild.commandPrefix}verify\` in ${verifyChannel} and it will update you accordingly.`)

    msg.reply(`Created channels ${verifyChannel} and ${instructionsChannel}. You can delete the default message in the instructions channel and replace it with your own if you wish.`)
  }
}
