const Command = require('../Command')

module.exports =
class VerifiedRoleCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'verifiedrole',
      properName: 'VerifiedRole',
      aliases: ['roververifiedrole'],
      description: '`<Discord Role>` Set the role that verified members will get. Default none',

      args: [
        {
          key: 'role',
          label: 'role',
          prompt: 'What role should verified members get?',
          type: 'role',
          default: false
        }
      ]
    })
  }

  async fn (msg, args) {
    let role = args.role
    if (role) {
      if (this.server.isRoleInUse(role.id)) {
        msg.reply(`That role is already in use. (verified role, not verified role, or from a group binding). Run \`${msg.guild.commandPrefix}bindings\` to see all role bindings.`)
      } else {
        this.server.setSetting('verifiedRole', role.id)
        msg.reply(`Set verified role to ${role.name}`)
      }
    } else {
      this.server.setSetting('verifiedRole', null)
      msg.reply('Cleared verified role, users will no longer receive a role when they verify.')
    }
  }
}
