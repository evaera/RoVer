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

    if (this.server.getSetting('verifiedRole') === args.role.id || this.server.getSetting('verifiedRemovedRole') === args.role.id) {
      msg.reply(
        oneLine`:no_entry_sign: That role is already in use. (verified role or not verified role).
        Run \`${msg.guild.commandPrefix}bindings\` to see all role bindings.`
      )
      return
    }

    if (args.role.name === '@everyone' || args.role.name === '@here') return msg.reply('You are unable to bind this role.')

    const serverBindings = this.server.getSetting('groupRankBindings')

    const existingIndex = serverBindings.findIndex(binding => binding.role === args.role.id)
    const binding = existingIndex !== -1 ? serverBindings[existingIndex] : {
      role: args.role.id,
      groups: []
    }

    for (const groupString of args.groups) {
      const [groupId, ranksString] = groupString.split(':')
      const existingGroupIndex = binding.groups.findIndex(group => group.id === groupId)
      const group = existingGroupIndex !== -1 ? binding.groups[existingGroupIndex] : {
        id: groupId,
        ranks: []
      }

      if (groupId.match(/[^\d]/) && !VirtualGroups[groupId]) {
        return msg.reply(
          stripIndents`:no_entry_sign: You have attempted to bind an invalid group (\`${groupId}\`). Possible causes:

          - You may have forgotten to put the Discord role name in quotation marks when it has spaces

          - You may have used invalid syntax: must match pattern "group_id:rank", "group_id:rank,rank,rank", or "group_id:rank-rank". (Pattern uses colons \`:\`, not semicolons \`;\`.)

          - You may have attempted to bind an invalid group id. Group IDs must be a whole number or be a valid VirtualGroup name.`
        )
      }

      // Converts the ranks into an object for quick lookup for existence
      const existingRanks = group.ranks.reduce((obj, item) => (obj[item] = true, obj), {})

      if (ranksString !== undefined) {
        const unparsedRanks = ranksString.split(',')
        for (const rank of unparsedRanks) {
          const rangeMatch = rank.match(/(\d+)-(\d+)/)
          
          if (rangeMatch) {
            const start = Util.clamp(parseInt(rangeMatch[1], 10), 1, 255)
            const stop = Util.clamp(parseInt(rangeMatch[2], 10), 1, 255)

            if (start && stop) {
              for (let i = start; i <= stop; i++) {
                if (!existingRanks[i]) group.ranks.push(i)
              }
            }
          } else if (rank.match(/[\d]+/)) {
            const rankNumber = Util.clamp(parseInt(rank), 1, 255)
            if (!existingRanks[rank]) group.ranks.push(rankNumber)
          } else {
            return msg.reply(`:no_entry_sign: You have attempted to bind an invalid rank (\`${rank}\`) for group (\`${groupId}\`). Ranks should be a whole number.`)
          }
        }
      } else if (!groupId.match(/[a-z]/i)) {
        for (let i = 1; i <= 255; i++) {
          if (!existingRanks[i]) group.ranks.push(i)
        }
      }

      if (existingGroupIndex !== -1) {
        group.ranks.sort((a, b) => a - b)
        binding.groups[existingGroupIndex] = group
      } else {
        binding.groups.push(group)
      }

    }

    // Add the new binding.
    if (existingIndex !== -1) {
      serverBindings[existingIndex] = binding
    } else {
      serverBindings.push(binding)
    }
    this.server.setSetting('groupRankBindings', serverBindings)

    let bindingSuccessMessage = `:white_check_mark: Successfully bound role "${args.role.name}".\`\`\`markdown\n`

    bindingSuccessMessage += Util.getBindingText(binding)

    bindingSuccessMessage += '```\n'

    msg.reply(bindingSuccessMessage)
  }
}
