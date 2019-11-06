const { stripIndents } = require('common-tags')
const Command = require('../Command')
const Util = require('../../Util')

module.exports =
class CreateVerifyChannelCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'createverifychannel',
      properName: 'CreateVerifyChannel',
      aliases: ['rovercreateverifychannel', 'createverify', 'createverificationchannel', 'createverification', 'createverifychannels'],
      description: 'Creates a channel category with verification instructions for new members and a channel for users to verify themselves'
    })
  }

  async fn (msg) {
    try {
      const overwritesInstructions = []
      const overwritesVerify = []

      overwritesInstructions.push({
        id: msg.guild.roles.find(role => role.name === '@everyone'),
        allowed: ['READ_MESSAGE_HISTORY', 'VIEW_CHANNEL'],
        denied: ['SEND_MESSAGES', 'ADD_REACTIONS']
      })

      overwritesVerify.push({
        id: msg.guild.roles.find(role => role.name === '@everyone'),
        allowed: ['SEND_MESSAGES', 'VIEW_CHANNEL'],
        denied: ['READ_MESSAGE_HISTORY']
      })

      const verifiedRole = this.server.getSetting('verifiedRole')
      if (verifiedRole) {
        overwritesVerify.push({
          id: verifiedRole,
          allowed: [],
          denied: ['VIEW_CHANNEL']
        })

        overwritesInstructions.push({
          id: verifiedRole,
          allowed: [],
          denied: ['VIEW_CHANNEL']
        })
      }

      const category = await msg.guild.channels.create('Verification', {
        type: 'category',
        reason: `${msg.member.displayName} ran CreateVerifyChannel command`,
        overwrites: overwritesInstructions
      })

      const instructionsChannel = await msg.guild.channels.create('verify-instructions', {
        type: 'text',
        parent: category,
        reason: `${msg.member.displayName} ran CreateVerifyChannel command`,
        overwrites: overwritesInstructions
      })

      const verifyChannel = await msg.guild.channels.create('verify', {
        type: 'text',
        parent: category,
        reason: `${msg.member.displayName} ran CreateVerifyChannel command`,
        overwrites: overwritesVerify
      })

      this.server.setSetting('verifyChannel', verifyChannel.id)

      instructionsChannel.send(
        stripIndents`This server uses a Roblox verification system. In order to unlock all the features of this server, you'll need to verify your Roblox account with your Discord account!

        Visit ${Util.getVerifyLink(msg.guild)} and follow the instructions. Then, say \`${msg.guild.commandPrefix}verify\` in ${verifyChannel.toString()} and it will update you accordingly.`
      )

      msg.reply(`Created channels ${verifyChannel} and ${instructionsChannel}. You can delete the default message in the instructions channel and replace it with your own if you wish.`)
    } catch (err) {
      msg.reply(':no_entry_sign: RoVer does not have permission to create channels in this server.')
    }
  }
}
