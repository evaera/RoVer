const Command = require('../Command')

module.exports =
class BindGroupCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'bindrank',
      aliases: ['roverbindgrouprank', 'bindgroup', 'bindgrouprank', 'roverbind'],
      description: '`!BindGroupRank <groupid> <"Discord Role Name"> [rank]` Binds Roblox group membership or group rank to a Discord role. Example: `!BindRank 372 "High Rank" >200` or `!BindRank 372 "Group Member"` or `!BindRank 372 "Group Owner" 255` or `!BindRank DevForum "DevForum Member"`. For help see https://github.com/evaera/RoVer#setting-up-roles-for-roblox-group-members-and-group-ranks',

      args: [
        {
          key: 'group',
          prompt: 'Group',
          type: 'string'
        },
        {
          key: 'role',
          prompt: 'Role',
          type: 'role'
        },
        {
          key: 'rank',
          prompt: 'Rank',
          type: 'string',
          default: 'all'
        }
      ]
    })
  }

  async fn (msg, args) {
    let binding = {}

    if (this.server.isRoleInUse(args.role.id)) {
      msg.reply('That role is already in use. (verified role, not verified role, or from a group binding). Run `!bindings` to see all role bindings.')
      return
    }

    // Support for operators, so we parse them out before
    // saving the rank number.
    let rankUnparsed = args.rank
    let all = false

    if (rankUnparsed === 'all') {
      rankUnparsed = '>1'
      all = true
    }

    if (rankUnparsed.startsWith('>')) {
      binding.operator = 'gt'
      rankUnparsed = rankUnparsed.substring(1)
    } else if (rankUnparsed.startsWith('<')) {
      binding.operator = 'lt'
      rankUnparsed = rankUnparsed.substring(1)
    }

    binding.group = args.group
    binding.rank = parseInt(rankUnparsed, 10)
    binding.role = args.role.id

    // Delete any previous binding with that role.
    this.server.deleteGroupRankBinding(binding.role)

    // Add the new binding.
    let serverBindings = this.server.getSetting('groupRankBindings')
    serverBindings.push(binding)
    this.server.setSetting('groupRankBindings', serverBindings)

    if (!all) {
      if (binding.group.match(/[a-z]/i)) {
        // This is a virtual group, since the id has letters.
        msg.reply(`Added virtual group binding: Name: \`${binding.group}\`, Argument: \`${binding.rank}\`, Role: \`${args.role.name}\``)
      } else {
        msg.reply(`Added rank binding: Group: ${binding.group}, Rank: ${binding.rank || 'none'}, Role: ${args.role.name}, Comparison: ${binding.operator || 'eq'}`)
      }
    } else if (binding.group.match(/[a-z]/i)) {
      // This is a virtual group, since the id has letters.
      msg.reply(`Added virtual group binding: Name: \`${binding.group}\`, Role: \`${args.role.name}\``)
    } else {
      msg.reply(`Added rank binding for all members in group: Group: ${binding.group}, Role: ${args.role.name}`)
    }
  }
}
