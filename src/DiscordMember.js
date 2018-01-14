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
      this.user = await this.bot.users.fetch(this.id, false)
      this.member = await this.server.members.fetch(this.user, false)
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

    // If options.message is provided, we reply to that message with a status update
    // and edit it with new info throughout the verification. It's also called upon
    // this function returning output, so we need a default state for it to be a
    // simple passthrough function.
    let status = action => action

    if (options.message) {
      // Create the status message and save initial information.
      let statusMessage = await options.message.reply(':bulb: Working...')

      // We don't want to edit the message too quickly, otherwise Discord will throttle us. T
      // This limits edits to one per second but keeps it up to date after at least 1 second passes.
      let lastEdit = (new Date()).getTime()
      let editIndex = 0
      status = action => {
        editIndex++
        let thisIndex = editIndex

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
    if (this.member.roles.find('name', 'RoVer Bypass')) {
      return status({
        status: false,
        error: ':octagonal_sign: RoVer cannot act on users with the "RoVer Bypass" role.',
        nonFatal: true
      })
    }

    // Create a warning to append to any errors. In some permission setups, RoVer is reliant on role positioning (specifically if it has administrator or not)
    if ((await this.server.members.fetch(this.bot.user.id)).highestRole.comparePositionTo(this.member.highestRole) < 1) {
      errorAppend = "\n\nRoVer's position in the role list is below that of this user. With certain setups, this will prevent RoVer from working correctly. Please have a server admin drag RoVer's role above all other roles in order to fix this problem."
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
      }
    } catch (e) {
      if (config.loud) console.log(e)
      return status({
        status: false,
        error: 'Unknown error.'
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

      status(':dividers:️ Updating your nickname and roles...')

      if (this.discordServer.getSetting('verifiedRole')) {
        let role = this.discordServer.getSetting('verifiedRole')
        if (!this.member.roles.has(role) && this.server.roles.has(role)) {
          try {
            await this.member.addRole(role)
          } catch (e) {
            if (config.loud) console.log(e)
            return status({
              status: false,
              nonFatal: true,
              error: "RoVer doesn't have permissions to add roles to that user." + errorAppend
            })
          }
        }
      }

      if (this.discordServer.getSetting('verifiedRemovedRole')) {
        let role = this.discordServer.getSetting('verifiedRemovedRole')
        if (this.member.roles.has(role) && this.server.roles.has(role)) {
          try {
            await this.member.removeRole(role)
          } catch (e) {
            if (config.loud) console.log(e)
            return status({
              status: false,
              nonFatal: true,
              error: "RoVer doesn't have permission to remove roles from that user." + errorAppend
            })
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
            return status({
              status: false,
              nonFatal: true,
              error: this.member.guild.ownerID === this.member.id ? "Sorry, RoVer can't change the server owner's nickname due to Discord permission restrictions. Please manually update your nickname. Or don't, I'm just an error message." : "RoVer doesn't have permission to change that user's nickname." + errorAppend
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

        let promises = []
        for (let binding of this.discordServer.getSetting('groupRankBindings')) {
          // We use a Promise.then here so that they all execute asynchronously.
          promises.push(DiscordServer.resolveGroupRankBinding(binding, data.robloxId, data.robloxUsername)
            .then((state) => {
              let hasRole = this.member.roles.get(binding.role) != null
              if (hasRole === state) return

              if (!this.server.roles.has(binding.role)) return

              if (state === true) {
                this.member.addRole(binding.role).catch(e => {})
              } else {
                this.member.removeRole(binding.role).catch(e => {})
              }
            })
            // .catch(e => {
            //   if (config.loud) console.log(e.name)
            //   channel.send('')
            // })
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
        case 404:
        // User isn't in the database.

        // Add the "Not Verified" role to the user.
          if (this.discordServer.getSetting('verifiedRemovedRole')) {
            try {
              await this.member.addRole(this.discordServer.getSetting('verifiedRemovedRole'))
            } catch (e) {}
          }

          return status({
            status: false,
            error: `:wave: You must be new! Please go to ${Util.getVerifyLink(this.discordServer.server)} and follow the instructions on the page in order to get verified.`
          })
        case 429:
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
