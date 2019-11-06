const Command = require('../Command')

module.exports =
class NotVerifiedRoleCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'unverifiedrole',
      properName: 'UnverifiedRole',
      aliases: ['roververifiedremovedrole', 'verifiedremovedrole', 'rovernotverifiedrole', 'notverifiedrole'],
      description: '`<Discord Role>` Set the role that unverified users will get, and then lose when they verify. Default none',

      args: [
        {
          key: 'role',
          label: 'role',
          prompt: 'What role should non-verified users get?',
          type: 'role',
          default: false
        }
      ]
    })
  }

  async fn (msg, args) {
    if (this.server.ongoingSettingsUpdate) return msg.reply('Server settings are currently being saved - please try again in a few moments.')
    const role = args.role
    if (role) {
      if (role.name === '@everyone' || role.name === '@here') return msg.reply('You are unable to use this role.')
      if (this.server.isRoleInUse(role.id)) {
        msg.reply(`That role is already in use. (verified role, not verified role, or from a group binding). Run \`${msg.guild.commandPrefix}bindings\` to see all role bindings.`)
      } else {
        this.server.setSetting('verifiedRemovedRole', role.id)
        msg.reply(`Set non-verified role to ${role.name}`)
      }
    } else {
      this.server.setSetting('verifiedRemovedRole', null)
      msg.reply('Cleared removed verification role, users will no longer be removed from it on verification.')
    }
  }
}
