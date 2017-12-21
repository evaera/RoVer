/* global Cache */
const config = require('./data/client.json')
const Util = require('./Util')

const request = require('request-promise').defaults({pool: {maxSockets: Infinity}})

let DiscordServer

/**
 * A representation of a Discord guild member.
 * @class DiscordMember
 */
class DiscordMember {
  /**
   * Creates an instance of DiscordMember.
   * @param {DiscordServer} discordServer The DiscordServer to which this DiscordMember belongs
   * @param {Snowflake} id The user id
   * @hideconstructor
   */
  constructor (discordServer, id) {
    this.discordServer = discordServer
    this.id = id

    this.bot = this.discordServer.bot
    this.server = this.discordServer.server

    // Have to do this to prevent circular reference in file requires
    // Gets a reference to DiscordServer so we can run static methods
    DiscordServer = this.discordServer.constructor
  }

  /**
   * Creates, prepares, and returns a new DiscordMember
   *
   * @static
   * @param {DiscordServer} discordServer The DiscordServer to which this DiscordMember belongs
   * @param {Snowflake} id The user id
   * @returns {Promise<DiscordMember>} The newly created and prepared DiscordMember
   * @memberof DiscordMember
   */
  static async new (discordServer, id) {
    let discordMember = new DiscordMember(discordServer, id)

    if (!await discordMember.prepareMember()) {
      return false
    }

    return discordMember
  }

  /**
   * Fetches the user and member from Discord
   * @returns {Promise<boolean>} True if the member exists
   * @memberof DiscordMember
   */
  async prepareMember () {
    try {
      this.user = await this.bot.fetchUser(this.id, false)
      this.member = await this.server.fetchMember(this.user, false)
      return true
    } catch (e) {
      if (config.loud) console.log(`prepareMember: ${e.message}; ${this.id}; ${this.user}`)
      return false
    }
  }

  /**
   * Gets a member's nickname, formatted with this server's specific settings.
   *
   * @param {object} data String replacement data
   * @returns {string} The formatted nickname
   * @memberof DiscordMember
   */
  getNickname (data) {
    return Util.formatDataString(this.discordServer.getSetting('nicknameFormat'), data, this.member)
  }

  /**
   * Called to update the state of a specific member in this Discord server.
   *
   * @param {object} options Options for the verification
   * @param {boolean} options.announce Whether or not to announce this verification
   * @param {boolean} options.clearBindingsCache Whether or not to clear the bindings cache before verifying
   * @returns {object} VerificationResult
   * @returns {boolean} VerificationResult.status - Whether or not the verification was successful
   * @returns {boolean} VerificationResult.error - What went wrong
   * @returns {boolean} VerificationResult.nonFatal - If the verification error was fatal (e.g., this error would occur on any guild, not just this one)
   * @memberof DiscordMember
   */
  async verify (options) {
    options = options || {}
    let data = {}
    let freshData = false

    if (!this.member && !await this.prepareMember()) {
      return {
        status: false,
        error: 'User not in guild.',
        nonFatal: true
      }
    }

    try {
      // Read user data from memory, or request it if there isn't any cached.
      data = await Cache.get('users', this.id)
      if (!data) {
        data = await request({
          uri: `https://verify.eryn.io/api/user/${this.id}`,
          json: true,
          simple: false
        })
        freshData = true
      }
    } catch (e) {
      if (config.loud) console.log(e)
      return {
        status: false,
        error: 'Unknown error.'
      }
    }

    // If the status is ok, the user is in the database.
    if (data.status === 'ok') {
      // We only want to update the username if this data isn't from the cache.
      if (freshData) {
        // Resolve the Roblox username from the user id.
        let apiUserData = {}
        try {
          apiUserData = await request({
            uri: `http://api.roblox.com/users/${data.robloxId}`,
            json: true,
            simple: false
          })
        } catch (e) {
          return false
        }

        if (apiUserData.Username) {
          data.robloxUsername = apiUserData.Username
        }
      }

      // Cache the data for future use.
      Cache.set('users', this.id, data)

      // Check if these settings are enabled for this specific server,
      // if so, then put the member in the correct state.

      if (this.discordServer.getSetting('verifiedRole')) {
        let role = this.discordServer.getSetting('verifiedRole')
        if (!this.member.roles.get(role)) {
          try {
            await this.member.addRole(role)
          } catch (e) {
            if (config.loud) console.log(e)
            return {
              status: false,
              nonFatal: true,
              error: "RoVer doesn't have permissions to add roles to that user."
            }
          }
        }
      }

      if (this.discordServer.getSetting('verifiedRemovedRole')) {
        let role = this.discordServer.getSetting('verifiedRemovedRole')
        if (this.member.roles.get(role)) {
          try {
            await this.member.removeRole(role)
          } catch (e) {
            if (config.loud) console.log(e)
            return {
              status: false,
              nonFatal: true,
              error: "RoVer doesn't have permission to remove roles from that user."
            }
          }
        }
      }

      if (this.discordServer.getSetting('nicknameUsers')) {
        let nickname = this.getNickname(data).substring(0, 32)
        if (this.member.displayName !== nickname) {
          try {
            await this.member.setNickname(nickname)
          } catch (e) {
            if (config.loud) console.log(e)
            return {
              status: false,
              nonFatal: true,
              error: this.member.guild.ownerID === this.member.id ? "Sorry, RoVer can't change the server owner's nickname due to Discord permission restrictions. Please manually update your nickname. Or don't, I'm just an error message." : "RoVer doesn't have permission to change that user's nickname."
            }
          }
        }
      }

      if (this.discordServer.getSetting('announceChannel') && options.announce !== false) {
        let channel = await this.server.channels.get(this.discordServer.getSetting('announceChannel'))

        if (channel) {
          try {
            channel.send(`**User verified:** <@${this.id}> as ${data.robloxUsername}`)
          } catch (e) {}
        }
      }

      // Check if we want to resolve group rank bindings with cached or fresh data.
      if (options.clearBindingsCache !== false) {
        await Cache.clear(`bindings.${data.robloxId}`)
      }

      // Resolve group rank bindings for this member.
      if (this.discordServer.getSetting('groupRankBindings').length > 0) {
        for (let binding of this.discordServer.getSetting('groupRankBindings')) {
          // We use a Promise.then here so that they all execute asynchronously.
          DiscordServer.resolveGroupRankBinding(binding, data.robloxId, data.robloxUsername)
            .then((state) => {
              let hasRole = this.member.roles.get(binding.role) != null
              if (hasRole === state) return

              if (state === true) {
                this.member.addRole(binding.role).catch(e => {})
              } else {
                this.member.removeRole(binding.role).catch(e => {})
              }
            })
            .catch(e => {
              if (config.loud) console.log(e)
              console.log('Resolution error for binding')
            })
        }
      }

      return {
        status: true,
        robloxUsername: data.robloxUsername,
        robloxId: data.robloxId,
        discordId: this.member.id,
        discordName: this.member.user.username
      }
    } else {
      // Status was not "ok".
      switch (data.errorCode) {
        case 404:
        // User isn't in the database.

        // Add the "Not Verified" role to the user.
          if (this.discordServer.getSetting('verifiedRemovedRole')) {
            try {
              await this.member.addRole(this.discordServer.getSetting('verifiedRemovedRole'))
            } catch (e) {}
          }

          return {
            status: false,
            error: 'You don\'t seem to be verified! Please go to https://verify.eryn.io and follow the instructions on the page in order to get verified.'
          }
        case 429:
        // This client has exceeded the amount of requests allowed in a 60 second period.
          return {
            status: false,
            error: 'Server is busy. Please try again later.'
          }
        default:
        // Something else is wrong.
          return {
            status: false,
            error: 'Unknown error.'
          }
      }
    }
  }
}

module.exports = DiscordMember
