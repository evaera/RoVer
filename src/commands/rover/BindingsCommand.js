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
    let bindingText = ''

    if (this.server.getSetting('verifiedRole')) {
      let id = this.server.getSetting('verifiedRole')
      bindingText += `${this.getRoleName(id)} <${id}>\n\`\`\`fix\nVerified\n\`\`\`\n`
    }

    if (this.server.getSetting('verifiedRemovedRole')) {
      let id = this.server.getSetting('verifiedRemovedRole')
      bindingText += `**Unverified Role**\n${this.getRoleName(id)} <${id}>\n\`\`\`css\nNot verified\n\`\`\`\n`
    }

    if (bindingText.length > 0) {
      msg.reply('**__Role Bindings__**\n\n' + bindingText)
    } else {
      msg.reply('No verified or unverified roles are configured. Run `!verifiedrole <role>` or `unverifiedrole <role>` to set them.')
    }

    this.server.cleanupRankBindings()

    let groupBindingsText = ''
    for (let binding of this.server.getSetting('groupRankBindings')) {
      if (binding.groups == null) {
        binding = DiscordServer.convertOldBinding(binding)
      }

      if (groupBindingsText === '') {
        groupBindingsText = '**__Group Bindings__**\n\n'
      }

      let id = binding.role

      groupBindingsText += `${this.getRoleName(id)} <${id}>\n\`\`\`markdown\n`

      for (let [index, group] of binding.groups.entries()) {
        if (index > 0) groupBindingsText += '...or\n'

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

      if (groupBindingsText.length > 1500) {
        msg.reply(groupBindingsText)
        groupBindingsText = ''
      }
    }

    if (groupBindingsText.length > 0) msg.reply(groupBindingsText)
  }
}
