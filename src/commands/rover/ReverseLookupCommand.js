const Command = require('../Command')
const request = require('request-promise')
const config = require('../../data/client.json')

module.exports =
class LookupCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'reverselookup',
      properName: 'Reverse Lookup',
      aliases: ['rlookup', 'rlook'],
      description: "`<user id>` Get a Roblox User's Discord username if they are in your server.",

      args: [
        {
          key: 'id',
          label: 'user id',
          prompt: 'What is their user id?',
          type: 'integer'
        }
      ]
    })
  }

  async fn (msg, args) {
    if (!config.reverseLookupApiKey) {
      return msg.reply('Sorry, reverse lookup is only available on official versions of RoVer.')
    }

    const userId = args.id

    const data = await request({
      uri: `https://verify.eryn.io/api/roblox/${userId}?apiKey=${config.reverseLookupApiKey}`,
      json: true,
      simple: false
    })

    if (data.status !== 'ok') {
      return msg.reply('API request failed, sorry!')
    }

    const foundMembers = []

    await Promise.all(data.users.map(async id => {
      try {
        const member = await msg.guild.members.fetch(id, false)

        if (member) {
          foundMembers.push(`${member.displayName} (${member.user.tag}) [\`${member.id}\`]`)
        }
      } catch (e) { }
    }))

    if (foundMembers.length > 0) {
      return msg.reply(`Results found:\n\n${foundMembers.join('\n')}`)
    } else {
      return msg.reply('Sorry, no results found! Reverse lookup will only show members who are in this server.')
    }
  }
}
