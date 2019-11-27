/* global Cache */
const { stripIndents } = require('common-tags')
const config = require('./data/client.json')
const Util = require('./Util')

const request = require('request-promise').defaults({ pool: { maxSockets: Infinity } })

let DiscordServer
const VerificationAttempts = new Map()

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
    const discordMember = new DiscordMember(discordServer, id)

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
      this.user = await this.bot.users.fetch(this.id, false)
      this.member = await this.server.members.fetch(this.user, false)
      return true
    } catch (e) {
      if (config.loud) console.log(`prepareMember: ${e.message}; ${this.id}; ${this.user}`)
      return false
    }
  }

  getCachedNickname () {
    return this.discordServer.nicknames.get(this.id)
  }

  shouldUpdateNickname (currentName) {
    if (this.discordServer.getSetting('nicknameUsers')) {
      return !this.discordServer.nicknames.has(this.id) ||
        this.discordServer.nicknames.get(this.id) !== currentName
    } else {
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
  async getNickname (data) {
    const nicknameData = {
      robloxUsername: data.robloxUsername,
      robloxId: data.robloxId,
      discordId: data.discordId,
      discordName: data.discordName
    }

    if (this.discordServer.getSetting('nicknameGroup')) {
      const apiRank = await DiscordServer.getRobloxMemberGroups(nicknameData.robloxId)

      for (const groups of apiRank) {
        if (parseInt(groups.Id) === parseInt(this.discordServer.getSetting('nicknameGroup'))) {
          const rankMatch = groups.Role.match(/(.+(?:\]|\)|\}|\|))/)
          nicknameData.groupRank = rankMatch ? rankMatch[1] : `[${groups.Role}]`
          break
        }
      }
      nicknameData.groupRank = nicknameData.groupRank || '[Guest]'
    }
    return Util.formatDataString(this.discordServer.getSetting('nicknameFormat'), nicknameData, this.member)
  }

  /**
   * Called to update the state of a specific member in this Discord server.
   *
   * @param {object} options Options for the verification
   * @param {boolean} options.announce Whether or not to announce this verification
   * @param {boolean} options.clearBindingsCache Whether or not to clear the bindings cache before verifying
   * @param {boolean} options.skipWelcomeMessage Whether or not to use a generic success message than the server welcome message
   * @param {boolean} options.message The message to edit and update throughout the verification
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
    let errorAppend = ''

    if (!this.discordServer.areSettingsLoaded) {
      await this.discordServer.loadSettings()
    }

    // We only want to cleanup rank bindings if this is a manually-invoked verification.
    if (options.clearBindingsCache !== false) {
      this.discordServer.cleanupRankBindings(options.message ? options.message.channel : undefined)
    }

    if (options.message) {
      // Verification cooldown
      if (this.discordServer.verifyCooldowns.has(this.id) && Date.now() - this.discordServer.verifyCooldowns.get(this.id) < 5000) {
        return {
          status: false,
          nonFatal: true,
          error: ':alarm_clock: Please wait at least five seconds before trying to verify again.'
        }
      }

      this.discordServer.verifyCooldowns.set(this.id, Date.now())

      // Clear the request cache so we get fresh information.
      // We only want to clear on manually-invoked verifications.
      await DiscordServer.clearMemberCache(this.id)
    }

    // If options.message is provided, we reply to that message with a status update
    // and edit it with new info throughout the verification. It's also called upon
    // this function returning output, so we need a default state for it to be a
    // simple passthrough function.
    let status = action => action

    if (options.message) {
      // Create the status message and save initial information.
      const statusMessage = await options.message.reply(':bulb: Working...')

      // We don't want to edit the message too quickly, otherwise Discord will throttle us. T
      // This limits edits to one per second but keeps it up to date after at least 1 second passes.
      let lastEdit = (new Date()).getTime()
      let editIndex = 0
      status = action => {
        editIndex++
        const thisIndex = editIndex

        // A self-invoking async function so that we can delay the message sending if necessary,
        // but we don't delay the return value.
        ;(async () => {
          if ((new Date()).getTime() - lastEdit < 1000) {
            await Util.sleep(1000 - ((new Date()).getTime() - lastEdit))

            if (editIndex !== thisIndex) {
              // A new message has been sent since this was called, so ignore it.
              return
            }
          }

          lastEdit = (new Date()).getTime()

          if (typeof action === 'string') {
            statusMessage.edit(`${this.member}, ${action}`)
          } else if (action.error != null) {
            statusMessage.edit(`${this.member}, :exclamation:${action.error.startsWith(':') ? '' : ' '}${action.error}`)
          } else if (action.status === true) {
            let welcomeMessage = this.discordServer.getWelcomeMessage(action, this.member)
            if (options.skipWelcomeMessage) {
              welcomeMessage = `${this.member.displayName} has been verified.`
            }

            statusMessage.edit(`${options.message.author}, :white_check_mark: ${welcomeMessage}`)
          }
        })()

        return action
      }
    }

    if (!this.discordServer.isAuthorized()) {
      return status({
        status: false,
        error: "Sorry, this server isn't authorized to use RoVer Plus. Donate at <https://www.patreon.com/erynlynn> or invite the regular RoVer bot at <https://RoVer.link>."
      })
    }

    // Check if the user is even in the server
    if (!this.member && !await this.prepareMember()) {
      return status({
        status: false,
        error: ":mag: We couldn't find that user here.",
        nonFatal: true
      })
    }

    // We don't want to work with bots
    if (this.user.bot) {
      return status({
        status: false,
        error: ':robot: RoVer cannot verify bots.'
      })
    }

    // Ignore users with this specific role (to give server owners more power)
    if (this.member.roles.find(role => role.name === 'RoVer Bypass')) {
      return status({
        status: false,
        error: ':octagonal_sign: RoVer cannot act on users with the "RoVer Bypass" role.',
        nonFatal: true
      })
    }

    // Create a warning to append to any errors. In some permission setups, RoVer is reliant on role positioning (specifically if it has administrator or not)
    this.server.members.fetch(this.bot.id, true)
    if (!this.member.manageable) {
      errorAppend = "\n\nRoVer's position in the role list is below that of this user. Please have a server admin drag RoVer's role above all other roles in order to fix this problem."
    }

    status(':scroll: Checking the verification registry...')
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

        // Cache the data for future use.
        await Cache.set('users', this.id, data)
      }
    } catch (e) {
      if (config.loud) console.log(e)
      return status({
        status: false,
        error: 'There was an error while trying to fetch this user\'s verification data!'
      })
    }

    // If the status is ok, the user is in the database.
    if (data.status === 'ok') {
      // We only want to update the username if this data isn't from the cache.
      if (freshData) {
        status(':newspaper: Getting latest profile information...')
        // Resolve the Roblox username from the user id.
        let apiUserData = {}
        try {
          apiUserData = await request({
            uri: `http://api.roblox.com/users/${data.robloxId}`,
            json: true,
            simple: false
          })
        } catch (e) {
          if (config.loud) console.log(e)
          return status({
            status: false,
            error: 'There was an error while fetching the user\'s data!'
          })
        }

        if (apiUserData.errors && apiUserData.errors[0] && apiUserData.errors[0].code === 0) {
          return status({
            status: false,
            error: 'Roblox is currently undergoing maintenance. Please try again later.'
          })
        }

        if (apiUserData.Username) {
          data.robloxUsername = apiUserData.Username
        }

        // Cache data again
        Cache.set('users', this.id, data)
      }

      // Check if these settings are enabled for this specific server,
      // if so, then put the member in the correct state.

      status(':dividers:️ Updating your nickname and roles...')

      if (this.discordServer.getSetting('verifiedRole')) {
        const role = this.discordServer.getSetting('verifiedRole')
        if (!this.member.roles.has(role) && this.server.roles.has(role)) {
          try {
            await this.member.roles.add(role)
          } catch (e) {
            if (config.loud) console.log(e)
            return status({
              status: false,
              nonFatal: true,
              error: "There was an error while trying to assign the verified role! Ensure RoVer's role is above it." + errorAppend
            })
          }
        }
      }

      if (this.discordServer.getSetting('verifiedRemovedRole')) {
        const role = this.discordServer.getSetting('verifiedRemovedRole')
        if (this.member.roles.has(role) && this.server.roles.has(role)) {
          try {
            await this.member.roles.remove(role)
          } catch (e) {
            if (config.loud) console.log(e)
            return status({
              status: false,
              nonFatal: true,
              error: "There was an error while trying to remove the verified role! Ensure RoVer's role is above it." + errorAppend
            })
          }
        }
      }

      if (
        this.discordServer.getSetting('nicknameUsers') &&
        !this.member.roles.find(role => role.name === 'RoVer Nickname Bypass')
      ) {
        const nickname = (await this.getNickname(data)).substring(0, 32)

        this.discordServer.nicknames.set(this.id, nickname)

        if (this.member.displayName !== nickname) {
          try {
            await this.member.setNickname(nickname)
          } catch (e) {
            if (config.loud) console.log(e)
            return status({
              status: false,
              nonFatal: true,
              error: this.member.guild.ownerID === this.member.id ? "Sorry, Discord doesn't allow bots to change the server owner's nickname. Please manually update your nickname. Or don't, I'm just an error message." : "RoVer doesn't have permission to change that user's nickname." + errorAppend
            })
          }
        }
      }

      if (options.announce !== false) {
        this.discordServer.announce('User Verified', `<@${this.id}> verified as [${data.robloxUsername}](https://www.roblox.com/users/${data.robloxId}/profile)`)
      }

      // Check if we want to resolve group rank bindings with cached or fresh data.
      if (options.clearBindingsCache !== false) {
        await Cache.clear(`bindings.${data.robloxId}`)
      }

      // Resolve group rank bindings for this member.
      if (this.discordServer.getSetting('groupRankBindings').length > 0) {
        status(':mag_right: Checking group ranks...')

        await DiscordServer.getRobloxMemberGroups(data.robloxId)

        const promises = []
        for (const binding of this.discordServer.getSetting('groupRankBindings')) {
          // We use a Promise.then here so that they all execute asynchronously.
          promises.push(DiscordServer.resolveGroupRankBinding(binding, data.robloxId, data.robloxUsername)
            .then((state) => {
              const hasRole = this.member.roles.get(binding.role) != null
              if (hasRole === state) return

              if (!this.server.roles.has(binding.role)) return

              if (state === true) {
                this.member.roles.add(binding.role).catch(e => {})
              } else {
                this.member.roles.remove(binding.role).catch(e => {})
              }
            })
          )
        }

        try {
          await Promise.all(promises)
        } catch (e) {
          return status({
            status: false,
            nonFatal: true,
            error: "Something went wrong when checking group membership. It appears the Roblox group API is offline or returning malformed data. It's possible Roblox is down for maintenance or there is something else wrong with Roblox. Please try again later. If this problem is unique or is lasting longer than is expected, please join our support server by saying `!support`."
          })
        }
      }

      // Clear verification attempt history
      VerificationAttempts.delete(this.id)

      return status({
        status: true,
        robloxUsername: data.robloxUsername,
        robloxId: data.robloxId,
        discordId: this.member.id,
        discordName: this.member.user.username
      })
    } else {
      // Status was not "ok".
      switch (data.errorCode) {
        case 404: {
          // User isn't in the database.
          // Add the "Not Verified" role to the user.

          if (this.discordServer.getSetting('verifiedRemovedRole')) {
            try {
              await this.member.roles.add(this.discordServer.getSetting('verifiedRemovedRole'))
            } catch (e) {}
          }

          let error = `:wave: You must be new! Please go to ${Util.getVerifyLink(this.discordServer.server)} and follow the instructions on the page in order to get verified.`

          // Only trigger verification help message if this is a manually-invoked verification
          if (options.message) {
            if (VerificationAttempts.has(this.id) === false) {
              VerificationAttempts.set(this.id, 0)
            }

            VerificationAttempts.set(this.id, VerificationAttempts.get(this.id) + 1)

            if (VerificationAttempts.get(this.id) > 1) {
              error =
                stripIndents`:question: Looks like you are having trouble verifying your account! Here are some things you can try:

                - Try visiting https://verify.eryn.io/ in an incognito / private browser window. (It's possible you are signed into the wrong Discord account in your browser)
                - If you are using the profile code verification method, make sure that the code isn't getting filtered after you save it. If it is, try using the in-game method or generating a new code.
                - Make sure you typed in the right Roblox username when trying to verify.`

              VerificationAttempts.set(this.id, -5)
            }
          }

          return status({
            status: false,
            error
          })
        } case 429:
          // This client has exceeded the amount of requests allowed in a 60 second period.
          return status({
            status: false,
            error: 'Server is busy. Please try again later.'
          })
        default:
          // Something else is wrong.
          return status({
            status: false,
            error: "Sorry, it looks like there's something wrong with the verification registry. Please try again later."
          })
      }
    }
  }
}

module.exports = DiscordMember
