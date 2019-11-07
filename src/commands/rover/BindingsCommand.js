const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')
const Util = require('../../Util')

module.exports =
class BindingsCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'bindings',
      properName: 'Bindings',
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
  async getRoleName (id) {
    const role = await this.server.server.roles.fetch(id)
    if (role) return role.name
    return '<Deleted role>'
  }

  async fn (msg) {
    let bindingText = ''

    if (this.server.getSetting('verifiedRole')) {
      const id = this.server.getSetting('verifiedRole')
      bindingText += `**Verified Role**\n${await this.getRoleName(id)} <${id}>\n\n`
    }

    if (this.server.getSetting('verifiedRemovedRole')) {
      const id = this.server.getSetting('verifiedRemovedRole')
      bindingText += `**Unverified Role**\n${await this.getRoleName(id)} <${id}>\n\n`
    }

    if (bindingText.length > 0) {
      msg.reply('**__Role Bindings__**\n\n' + bindingText)
    } else {
      msg.reply('No verified or unverified roles are configured. Run `!verifiedrole <role>` or `unverifiedrole <role>` to set them.')
    }

    await this.server.cleanupRankBindings(msg.channel)

    let groupBindingsText = ''
    for (let binding of this.server.getSetting('groupRankBindings')) {
      if (binding.groups == null) {
        binding = DiscordServer.convertOldBinding(binding)
      }

      if (groupBindingsText === '') {
        groupBindingsText = '**__Group Bindings__**\n\n'
      } else if (groupBindingsText === ' ') {
        groupBindingsText = '**__Group Bindings (cont.)__**\n\n'
      }

      const id = binding.role

      groupBindingsText += `${await this.getRoleName(id)} <${id}>\n\`\`\`markdown\n`

      groupBindingsText += Util.getBindingText(binding)

      groupBindingsText += '```\n'

      if (groupBindingsText.length > 1500) {
        msg.reply(groupBindingsText)
        groupBindingsText = ' '
      }
    }

    if (groupBindingsText.length > 0) msg.reply(groupBindingsText)
  }
}
