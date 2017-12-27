/* global Cache */
const Command = require('../Command')
const request = require('request-promise')

module.exports =
class WhoisCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'whois',
      aliases: ['roblox'],
      userPermissions: [],
      description: "`<person>` Get a verified person's ROBLOX & profile link.",

      args: [
        {
          key: 'member',
          label: 'member',
          prompt: 'What is their username?',
          type: 'member',
          default: false
        }
      ]
    })
  }

  async fn (msg, args) {
    let member = args.member
    let data = {}
    if (member) { // If the member specified exists,
      let id = member.user.id
      try {
        // Read user data from memory, or request it if there isn't any cached.
        data = await Cache.get('users', id)

        if (!data) {
          data = await request({
            uri: `https://verify.eryn.io/api/user/${id}`,
            json: true,
            simple: false
          })
        }
      } catch (e) {
        return msg.reply("An error occured while fetching that user's data.")
      }
      if (data.status === 'ok') {
        // Make sure the data is cached so we don't have to use the API in the future
        Cache.set('users', id, data)
        msg.reply(`${member.displayName}: https://www.roblox.com/users/${data.robloxId}/profile`)
      } else {
        msg.reply(`${member.displayName} doesn't seem to be verified.`)
      }
    }
  }
}
