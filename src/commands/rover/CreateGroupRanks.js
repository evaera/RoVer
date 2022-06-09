const request = require("request-promise")
const Command = require("../Command")
const config = require("../../data/client.json")

module.exports = class CreateGroupRanksCommand extends Command {
  constructor(client) {
    super(client, {
      name: "creategroupranks",
      properName: "CreateGroupRanks",
      aliases: ["rovercreategroupranks"],
      description:
        "Creates Discord roles from all of the roles in a given group, and then binds them to the group.",

      args: [
        {
          key: "groupid",
          label: "groupid",
          prompt: "Group ID",
          type: "integer",
        },
      ],
    })
  }

  async fn(msg, args) {
    if (config.settingsFrozen) return msg.reply(config.settingsFrozen)
    if (!msg.guild.me.hasPermission("MANAGE_ROLES")) {
      return msg.reply(
        "RoVer needs the 'Manage Roles' permission in order to do this.",
      )
    }

    if (this.server.ongoingSettingsUpdate)
      return msg.reply(
        "Server settings are currently being saved - please try again in a few moments.",
      )
    try {
      const { roles } = await request(
        `https://groups.roblox.com/v1/groups/${args.groupid}/roles`,
        { json: true },
      )

      const serverBindings = this.server.getSetting("groupRankBindings")
      roles.reverse()
      for (const role of roles) {
        const newRole =
          (await msg.guild.roles.cache.find(
            (guildRole) => guildRole.name === role.name,
          )) ||
          (await msg.guild.roles.create({
            data: {
              name: role.name,
              permissions: [],
            },
            reason: `${msg.member.displayName} ran CreateGroupRanks command`,
          }))

        this.server.deleteGroupRankBinding(newRole.id)

        serverBindings.push({
          role: newRole.id,
          groups: [
            {
              id: args.groupid.toString(),
              ranks: [role.rank],
            },
          ],
        })
      }
      this.server.setSetting("groupRankBindings", serverBindings)

      msg.reply(
        `Created ${roles.length} role bindings successfully (and created the roles if necessary).`,
      )
    } catch (e) {
      msg.reply(
        ":no_entry_sign: Something went wrong. Maybe the group doesn't exist, or maybe RoVer doesn't have permission to create roles in this server.",
      )
    }
  }
}
