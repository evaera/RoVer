const { stripIndents, oneLine } = require('common-tags')
const Command = require('../Command')
const Util = require('../../Util')
const VirtualGroups = require('../../VirtualGroups.js')
const config = require('../../data/client.json')

module.exports =
class BindGroupCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'bindrank',
      properName: 'BindRank',
      aliases: ['roverbindgrouprank', 'bindgroup', 'bindgrouprank', 'roverbind', 'bind'],
      description: '`<"Discord Role"> <group_id>:<rank_id>` Binds Roblox group membership or group rank to a Discord role. Example: `!BindRank "High Rank" 372372:150,200-255` or `!BindRank "Group Member" 372372` or `!BindRank "Faction Leader" 372372:255 3723293:255 584584:250-255` or `!BindRank "DevForum Member" DevForum`. For help see https://github.com/evaera/RoVer#setting-up-roles-for-roblox-group-members-and-group-ranks',

      args: [
        {
          key: 'role',
          prompt: 'Discord Role to bind:',
          type: 'role'
        },
        {
          key: 'groups',
          prompt: 'Group ranks to bind:',
          type: 'string',
          infinite: true
        }
      ]
    })
  }

  async fn (msg, args) {
    if (this.server.ongoingSettingsUpdate) return msg.reply('Server settings are currently being saved - please try again in a few moments.')
    if (config.maxServerBindings && this.server.getSetting('groupRankBindings').length > config.maxServerBindings) {
      return msg.reply('This server has exceeded the maximum amount of allowed role bindings.\n\nTo bind an unlimited number of roles, please consider a $6 monthly donation for RoVer Plus:\n <https://www.patreon.com/erynlynn>.\n\n*Please be aware that this is a temporary restriction as part of an effort to reduce resource consumption. In the future, more role bindings will be available for free.*')
    }

    const binding = {}

    if (this.server.isRoleInUse(args.role.id)) {
      msg.reply(
        oneLine`:no_entry_sign: That role is already in use. (verified role, not verified role, or from a group binding).
        Run \`${msg.guild.commandPrefix}bindings\` to see all role bindings.`
      )
      return
    }

    if (args.role.name === '@everyone' || args.role.name === '@here') return msg.reply('You are unable to bind this role.')

    binding.role = args.role.id
    binding.groups = []

    for (const groupString of args.groups) {
      const [groupId, ranksString] = groupString.split(':')
      const group = { id: groupId }

      if (groupId.match(/[^\d]/) && !VirtualGroups[groupId]) {
        return msg.reply(
          stripIndents`:no_entry_sign: You have attempted to bind an invalid group (\`${groupId}\`). Possible causes:

          - You may have forgotten to put the Discord role name in quotation marks when it has spaces

          - You may have used invalid syntax: must match pattern "group_id:rank", "group_id:rank,rank,rank", or "group_id:rank-rank". (Pattern uses colons \`:\`, not semicolons \`;\`.)

          - You may have attempted to bind an invalid group id. Group IDs must be a whole number or be a valid VirtualGroup name.`
        )
      }

      if (ranksString != null) {
        const ranks = []
        const unparsedRanks = ranksString.split(',')
        for (const rank of unparsedRanks) {
          const rangeMatch = rank.match(/(\d+)-(\d+)/)
          const rankNumber = parseInt(rank, 10)

          if (rangeMatch) {
            const start = parseInt(rangeMatch[1], 10)
            const stop = parseInt(rangeMatch[2], 10)

            if (start && stop) {
              for (let i = start; i <= stop; i++) {
                ranks.push(i)
              }
            }
          } else if (rankNumber != null) {
            ranks.push(rankNumber)
          }
        }
        group.ranks = ranks
      } else if (!groupId.match(/[a-z]/i)) {
        group.ranks = []
        for (let i = 1; i <= 255; i++) {
          group.ranks.push(i)
        }
      } else {
        group.ranks = []
      }

      binding.groups.push(group)
    }

    // Delete any previous binding with that role.
    this.server.deleteGroupRankBinding(binding.role)

    // Add the new binding.
    const serverBindings = this.server.getSetting('groupRankBindings')
    serverBindings.push(binding)
    this.server.setSetting('groupRankBindings', serverBindings)

    let bindingSuccessMessage = `:white_check_mark: Successfully bound role "${args.role.name}".\`\`\`markdown\n`

    bindingSuccessMessage += Util.getBindingText(binding)

    bindingSuccessMessage += '```\n'

    msg.reply(bindingSuccessMessage)
  }
}
