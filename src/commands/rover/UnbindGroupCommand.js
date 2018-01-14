const Command = require('../Command')

module.exports =
class UnbindGroupCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'unbind',
      properName: 'Unbind',
      aliases: ['roverunbindgrouprank', 'unbindgrouprank', 'unbindrank'],
      description: '`<Discord Role>` Unbind a group rank',

      args: [
        {
          key: 'role',
          label: 'role',
          prompt: 'Unbind a group rank (Role)',
          type: 'role'
        }
      ]
    })
  }

  async fn (msg, args) {
    let role = args.role
    if (role) {
      this.server.deleteGroupRankBinding(role.id)
      msg.reply(`Cleared all bindings associated to \`${role.name}\``)
    } else {
      msg.reply(`Role not found: \`${role}\``)
    }
  }
}
