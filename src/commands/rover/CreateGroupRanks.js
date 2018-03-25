const request = require('request-promise')
const Command = require('../Command')

module.exports =
class CreateGroupRanksCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'creategroupranks',
      properName: 'CreateVerifyChannel',
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
    try {
      const { Roles } = await request(`https://api.roblox.com/groups/${args.groupid}`, { json: true })

      let serverBindings = this.server.getSetting('groupRankBindings')
      for (let role of Roles) {
        const newRole = await msg.guild.roles.create({
          name: role.Name,
          permissions: [],
          reason: `${msg.member.displayName} ran CreateGroupRanks command`
        })

        serverBindings.push({
          role: newRole.id,
          groups: [{
            id: args.groupid.toString(),
            ranks: [role.Rank]
          }]
        })
      }
      this.server.setSetting('groupRankBindings', serverBindings)

      msg.reply(`Created ${Roles.length} roles and bound them successfully.`)
    } catch (e) {
      msg.reply(`:no_entry_sign: RoVer does not have permission to create roles in this server.`)
    }
  }
}
