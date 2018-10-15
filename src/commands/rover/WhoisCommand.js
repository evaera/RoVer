/* global Cache */
const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')
const VirtualGroups = require('../../VirtualGroups')
const request = require('request-promise')

const Contributors = require('../../Contributors.json')

module.exports =
class WhoisCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'whois',
      properName: 'Whois',
      aliases: ['roblox'],
      userPermissions: [],
      description: "`<user>` Get a user's Roblox profile link.",

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

  // This is probably the worst file in the entire project, so prepare yourself.
  // TODO: DRY this up and make the method that gets user data a method in DiscordMember
  async fn (msg, args) {
    let member = args.member
    let data = {}
    if (member) { // If the member specified exists,
      let editMessage = await msg.reply(`:mag: Looking up ${member.displayName.replace('@', '')}`)

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
        return editMessage.edit("An error occured while fetching that user's data.")
      }

      if (data.status === 'ok') {
        let apiUserData = {}
        try {
          apiUserData = await request({
            uri: `http://api.roblox.com/users/${data.robloxId}`,
            json: true,
            simple: false
          })
        } catch (e) {
          return editMessage.edit("An error occured while fetching that user's data.")
        }

        if (apiUserData.Username) {
          data.robloxUsername = apiUserData.Username
        }
        let profileLink = `https://www.roblox.com/users/${data.robloxId}/profile`
        let avatarURL = `https://assetgame.roblox.com/Thumbs/Avatar.ashx?username=${encodeURIComponent(data.robloxUsername)}`

        let bio = 'Bio failed to load'
        let joinDate = 'Unknown'
        let pastNames = 'Unknown'
        try {
          let profileSource = await request({
            uri: profileLink
          })

          joinDate = profileSource.match(/Join Date<p class=text-lead>(.*?)<li/)[1]
          bio = profileSource.match(/<meta name=description content=".*? is one of the millions playing, creating and exploring the endless possibilities of Roblox. Join .*? on Roblox and explore together! ?((?:.|\n)*?)"/m)[1]
          pastNames = profileSource.match(/<span class=tooltip-pastnames data-toggle=tooltip title="?(.*?)"?>/)[1].substr(0, 1024)
        } catch (e) {}

        let bc = 'Unknown'
        try {
          bc = await Cache.get(`bindings.${data.robloxId}`, 'bc')
          if (!bc) {
            let response = await request({
              uri: `https://www.roblox.com/Thumbs/BCOverlay.ashx?username=${encodeURIComponent(data.robloxUsername)}`,
              simple: false,
              resolveWithFullResponse: true
            })

            let url = response.request.uri.href
            bc = 'NBC'

            if (url.includes('overlay_obcOnly')) {
              bc = 'OBC'
            } else if (url.includes('overlay_tbcOnly')) {
              bc = 'TBC'
            } else if (url.includes('overlay_bcOnly')) {
              bc = 'BC'
            }

            Cache.set(`bindings.${data.robloxId}`, 'bc', bc)
          }
        } catch (e) {}

        // Make sure the data is cached so we don't have to use the API in the future
        Cache.set('users', id, data)

        // Remove excess new lines in the bio
        while ((bio.match(/\n/mg) || []).length > 3) {
          const lastN = bio.lastIndexOf('\n')
          bio = bio.slice(0, lastN) + bio.slice(lastN + 1)
        }

        // Truncate bio if it's too long
        if (bio.length > 500) {
          bio = bio.substr(0, 500) + '...'
        }

        // Add a space after any @ symbols to prevent tagging @everyone, @here, and @anything else Discord adds
        bio = bio.replace('@', '@ ')

        let embed = {
          title: 'View Profile',
          url: profileLink,
          author: {
            name: data.robloxUsername,
            url: profileLink,
            icon_url: avatarURL
          },
          color: args.member.displayColor,
          thumbnail: {
            url: avatarURL
          },
          description: bio,
          fields: [
            { name: 'Join Date', value: joinDate, inline: true },
            { name: 'Builders Club', value: bc, inline: true },
            { name: 'Past Usernames', value: pastNames, inline: true }
          ]
        }

        // Nickname Group rank display
        const nicknameGroup = this.server.getSetting('nicknameGroup')
        if (nicknameGroup) {
          const userGroups = await DiscordServer.getRobloxMemberGroups(data.robloxId)

          const serverGroup = userGroups.find(group => group.Id === parseInt(nicknameGroup))

          let isAlly = false
          if (!serverGroup) {
            isAlly = await VirtualGroups._Relationship({ id: data.robloxId }, parseInt(nicknameGroup), DiscordServer, 'allies')
          }

          embed.fields.push({
            name: `Group Rank`,
            value: isAlly ? 'Ally' : (serverGroup ? serverGroup.Role : 'Guest')
          })
        }

        if (Contributors.includes(id)) embed.fields.push({ name: 'User Tags', value: 'RoVer Contributor', inline: true })

        editMessage.edit({embed}).catch(console.error)
      } else {
        editMessage.edit(`${member.displayName} doesn't seem to be verified.`)
      }
    }
  }
}
