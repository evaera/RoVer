/* global Cache */
const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')
const VirtualGroups = require('../../VirtualGroups')
const request = require('request-promise')

const Accolades = require('../../Accolades.json')

/**
 * Check if the given user is in the Roblox Dev Forum.
 *
 * @param {object} user The user data
 * @returns {object} The DevForum profile data
 */
async function getDevForumProfile (user) {
  const userId = user.id
  let userProfile = await Cache.get(`bindings.${user.id}`, 'DevForumProfile')

  if (!userProfile) {
    try {
      const devForumData = await request({
        uri: `https://devforum.roblox.com/u/by-external/${userId}.json`,
        json: true,
        simple: false
      })

      userProfile = devForumData.user

      Cache.set(`bindings.${user.id}`, 'DevForumProfile', userProfile)
    } catch (e) {
      return false
    }
  }

  return userProfile
}

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
    const member = args.member
    let data = {}
    if (member) { // If the member specified exists,
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
          pastNamesData.data.forEach(oldname => pastNames += `, ${oldname.name}`)
          if (pastNames) pastNames = pastNames.replace(', ', '')
        } catch (e) {}

        let bc = 'Unknown'
        try {
          bc = await Cache.get(`bindings.${data.robloxId}`, 'bc')
          if (!bc) {
            const response = await request({
              uri: `https://groups.roblox.com/v1/users/${encodeURIComponent(data.robloxId)}/group-membership-status`,
              simple: false,
              resolveWithFullResponse: true
            })

            const membershipType = JSON.parse(response.body).membershipType
            bc = 'Regular'

            if (membershipType === 4) {
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
          color: args.member.displayColor,
          thumbnail: {
            url: avatarURL
          },
          description: bio,
          fields: [
            { name: 'Join Date', value: joinDate, inline: true },
            { name: 'Membership', value: bc, inline: true }
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
            name: 'Group Rank',
            value: isAlly ? 'Ally' : (serverGroup ? serverGroup.Role : 'Guest')
          })
        }

        if (Accolades[id]) embed.fields.push({ name: 'Accolades', value: `${Accolades[id]}`, inline: true })

        editMessage.edit({ embed: embed }).catch(console.error)
        
        let edited = false
        let scriptingHelpers = ""
        try {
          const response = await request({
            uri: `https://scriptinghelpers.org/resources/get_profile_by_roblox_id/${encodeURIComponent(data.robloxId)}`,
            simple: false,
            resolveWithFullResponse: true
          })
          scriptingHelpers = JSON.parse(response.body)
          Cache.set(`bindings.${data.robloxId}`, 'scriptingHelpers', scriptingHelpers)
        } catch(e) {}
        
        let devforumData = await getDevForumProfile({id: data.robloxId})
        
        let trustLevels = {
          4: "Roblox Staff",
          3: "Community Editor",
          2: "Regular",
          1: "Member",
          0: "Visitor",
        }
        
        if (devforumData !== false) {
          edited = true
          bio = devforumData.bio_raw
          // Remove excess new lines in the bio
          while ((bio.match(/\n/mg) || []).length > 3) {
            const lastN = bio.lastIndexOf('\n')
            bio = bio.slice(0, lastN) + bio.slice(lastN + 1)
          }

          // Truncate bio if it's too long
          if (bio.length > 500) {
            bio = bio.substr(0, 500) + '...'
          }
          embed.description = bio
          embed.fields.push({
            name: "DevForum",
            value: `[Profile Link](https://devforum.roblox.com/u/${devforumData.username}) \nLevel: ${trustLevels[devforumData.trust_level]} \n${devforumData.title ? "Title: " + devforumData.title : ""}`,
            inline: true
          })
        }
        
        if (scriptingHelpers !== "" && scriptingHelpers !== []) {
          edited = true
          embed.fields.push({
            name: "Scripting Helpers",
            value: `[Profile Link](https://scriptinghelpers.org/user/${scriptingHelpers.roblox_username}) \nReputation: ${scriptingHelpers.reputation} \nRank: ${scriptingHelpers.rank}`,
            inline: true
          })
        }
        
        if (edited == true) {
          editMessage.edit({ embed: embed }).catch(console.error)
        }
      } else {
        editMessage.edit(`${member.displayName} doesn't seem to be verified.`)
      }
    }
  }
}
