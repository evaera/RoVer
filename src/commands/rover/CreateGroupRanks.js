const request = require('request-promise')
const Command = require('../Command')

module.exports =
class CreateGroupRanksCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'creategroupranks',
      properName: 'CreateGroupRanks',
      aliases: ['rovercreategroupranks'],
      description: 'Creates Discord roles from all of the roles in a given group, and then binds them to the group.',

      args: [
        {
          key: 'groupid',
          label: 'groupid',
          prompt: 'Group ID',
          type: 'integer'
        }
      ]
    })
  }

  async fn (msg, args) {
    if (this.server.ongoingSettingsUpdate) return msg.reply('Server settings are currently being saved - please try again in a few moments.')
    try {
      const { Roles } = await request(`https://api.roblox.com/groups/${args.groupid}`, { json: true })

      const serverBindings = this.server.getSetting('groupRankBindings')
      Roles.reverse()
      for (const role of Roles) {
        const newRole = (await msg.guild.roles.find(guildRole => guildRole.name === role.Name)) || (await msg.guild.roles.create({
          data: {
            name: role.Name,
            permissions: []
          },
          reason: `${msg.member.displayName} ran CreateGroupRanks command`
        }))

        this.server.deleteGroupRankBinding(newRole.id)

        serverBindings.push({
          role: newRole.id,
          groups: [{
            id: args.groupid.toString(),
            ranks: [role.Rank]
          }]
        })
      }
      this.server.setSetting('groupRankBindings', serverBindings)

      msg.reply(`Created ${Roles.length} role bindings successfully (and created the roles if necessary).`)
    } catch (e) {
      msg.reply(':no_entry_sign: Something went wrong. Maybe the group doesn\'t exist, or maybe RoVer doesn\'t have permission to create roles in this server.')
    }
  }
}
