const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')
const Util = require('../../Util')

module.exports =
class BindingsCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'bindings',
      aliases: ['listbindings', 'roverbindings'],
      description: 'Displays a list of bound roles'
    })
  }

  /**
   * Checks if a role exists and return its name, or a default
   * value if it doesn't.
   * @param {Snowflake} id The Role id
   * @returns {string} The processed role name
   */
  getRoleName (id) {
    let role = this.server.server.roles.get(id)
    if (role) return role.name
    return '<Deleted role, delete this binding.>'
  }

  async fn (msg) {
    if (this.server.getSetting('verifiedRole')) {
      let id = this.server.getSetting('verifiedRole')
      msg.reply({ embed: {
        color: 0x2ecc71,
        title: 'Verified role',
        fields: [
          { name: 'Role name', value: this.getRoleName(id), inline: true },
          { name: 'Role id', value: id, inline: true }
        ]
      }})
    }

    if (this.server.getSetting('verifiedRemovedRole')) {
      let id = this.server.getSetting('verifiedRemovedRole')
      msg.reply({ embed: {
        color: 0xe74c3c,
        title: 'Not Verified role',
        fields: [
          { name: 'Role name', value: this.getRoleName(id), inline: true },
          { name: 'Role id', value: id, inline: true }
        ]
      }})
    }

    this.server.cleanupRankBindings()

    let groupBindingsText = ''
    for (let binding of this.server.getSetting('groupRankBindings')) {
      if (binding.groups == null) {
        binding = DiscordServer.convertOldBinding(binding)
      }

      if (groupBindingsText === '') {
        groupBindingsText = '**Group Bindings**\n\n'
      }

      let id = binding.role

      groupBindingsText += `${this.getRoleName(id)} <${id}>\n\`\`\`markdown\n`

      for (let group of binding.groups) {
        if (group.id.match(/[a-z]/i)) {
          groupBindingsText += `# VirtualGroup ${group.id}\n`
          groupBindingsText += `Argument ${group.ranks.length > 0 ? group.ranks[0] : 'none'}`
        } else {
          groupBindingsText += `# Group ${group.id}\n`
          groupBindingsText += `Rank${group.ranks.length === 1 ? '' : 's'} ` + Util.simplifyNumbers(group.ranks)
        }
        groupBindingsText += '\n\n'
      }

      groupBindingsText += '```\n'
    }

    if (groupBindingsText.length > 0) msg.reply(groupBindingsText, { split: true })
  }
}
