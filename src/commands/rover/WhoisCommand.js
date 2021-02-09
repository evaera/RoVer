/* global Cache */
const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')
const VirtualGroups = require('../../VirtualGroups')
const request = require('request-promise')

const Accolades = require('../../Accolades.json')

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
    // If no member is specified the member is the message author
    if (!member) member = msg.member
    let data = {}
    if (member) { // If the member specified exists,
      if (member.user.bot) return
      const editMessage = await msg.reply(`:mag: Looking up ${member.displayName.replace(/@/g, '')}`)
      
      const id = member.user.id
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
            uri: `https://users.roblox.com/v1/users/${data.robloxId}`,
            json: true,
            simple: false
          })
        } catch (e) {
          return editMessage.edit("An error occured while fetching that user's data.")
        }

        if (apiUserData.name) {
          data.robloxUsername = apiUserData.name
        }
        const profileLink = `https://www.roblox.com/users/${data.robloxId}/profile`
        let avatarURLdata = {}
        try {
          avatarURLdata = await request({
            uri: `https://thumbnails.roblox.com/v1/users/avatar?userIds=${data.robloxId}&size=720x720&format=png&isCircular=false`,
            json: true
          })
        } catch (e) {
          return editMessage.edit("An error occured while fetching that user's data.")
        }
        const avatarURL = avatarURLdata.data[0].imageUrl
        let bio = 'Bio failed to load'
        if (apiUserData.description) bio = apiUserData.description
        let joinDate = new Date(apiUserData.created)
        joinDate = `${joinDate.getMonth() + 1}/${joinDate.getDate()}/${joinDate.getFullYear()}`
        let pastNames = ''
        try {
          const pastNamesData = await request({
            uri: `https://users.roblox.com/v1/users/${data.robloxId}/username-history?limit=50&sortOrder=Desc`,
            json: true,
            simple: false
          })
          pastNamesData.data.forEach(oldname => { pastNames += `, ${oldname.name}` })
          if (pastNames) pastNames = pastNames.replace(', ', '')
        } catch (e) {}
        const { cookie } = require('../../data/client.json')
        let bc
        try {
          bc = await Cache.get(`bindings.${data.robloxId}`, 'bc')
          if (!bc && cookie) {
            const response = await request({
              uri: `https://premiumfeatures.roblox.com/v1/users/${data.robloxId}/validate-membership`,
              simple: false,
              json: true,
              resolveWithFullResponse: true,
              headers: {
                cookie: `.ROBLOSECURITY=${cookie}`
              }
            })
            bc = 'Regular'
            if (response.body && response.statusCode === 200) {
              bc = 'Premium'
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

        const embed = {
          title: 'View Profile',
          url: profileLink,
          author: {
            name: data.robloxUsername,
            url: profileLink,
            icon_url: avatarURL
          },
          color: member.displayColor,
          thumbnail: {
            url: avatarURL
          },
          description: bio,
          fields: [
            { name: 'Join Date', value: joinDate, inline: true }
          ]
        }

        // Edit so past names don't show unless you actually have some!
        if (pastNames && pastNames !== []) {
          embed.fields.push({
            name: 'Past Usernames',
            value: pastNames,
            inline: true
          })
        }
        if (bc) {
          embed.fields.push({
            name: 'Membership',
            value: bc,
            inline: true
          })
        }

        // Nickname Group rank display
        const nicknameGroup = this.server.getSetting('nicknameGroup')
        if (nicknameGroup) {
          const userGroups = await DiscordServer.getRobloxMemberGroups(data.robloxId)

          const serverGroup = userGroups.find(group => group.group.id === parseInt(nicknameGroup))

          let isAlly = false
          if (!serverGroup) {
            isAlly = await VirtualGroups._Relationship({ id: data.robloxId }, parseInt(nicknameGroup), DiscordServer, 'allies')
          }

          embed.fields.push({
            name: 'Group Rank',
            value: isAlly ? 'Ally' : (serverGroup ? serverGroup.role.name : 'Guest')
          })
        }

        if (Accolades[id]) embed.fields.push({ name: 'Accolades', value: `${Accolades[id]}`, inline: true })

        editMessage.edit({ embed: embed }).catch(console.error)
      } else {
        editMessage.edit(`${member.displayName} doesn't seem to be verified.`)
      }
    }
  }
}
