/* global Cache */

const path = require('path')
const fs = require('mz/fs')
const request = require('request-promise')
const VirtualGroups = require('./VirtualGroups.js')
const DiscordMember = require('./DiscordMember')
const Util = require('./Util')

// The default settings for DiscordServer.
const DefaultSettings = {
  verifiedRole: null,
  verifiedRemovedRole: null,
  nicknameUsers: true,
  nicknameGroup: null,
  joinDM: true,
  verifyChannel: null,
  announceChannel: null,
  nicknameFormat: '%USERNAME%',
  welcomeMessage: 'Welcome to %SERVER%, %USERNAME%!',
  groupRankBindings: []
}

/**
 * A DiscordServer class, it represents a guild that the bot is in.
 * @class DiscordServer
 */
class DiscordServer {
  /**
   * Creates an instance of DiscordServer.
   * @param {DiscordBot} discordBot The discord bot that the server belongs to.
   * @param {Snowflake} id The guild id
   */
  constructor (discordBot, id) {
    this.id = id
    this.discordBot = discordBot
    this.bot = this.discordBot.bot

    this.server = this.bot.guilds.get(id)

    this.verifyCooldowns = new Map()
    this.nicknames = new Map()

    this.ongoingBulkUpdate = false
    this.bulkUpdateCount = 0

    setInterval(() => {
      this.verifyCooldowns = new Map()
      this.nicknames = new Map()
    }, 7200000)

    // Load this server's settings.
    this.settings = {}
    this.areSettingsLoaded = false
    this.ongoingSettingsUpdate = false
    this.settingsPath = path.join(__dirname, 'data', `${id}.json`)

    // We will load the settings in DiscordBot.getServer in order to know when
    // the server is ready from the promise it returns.
    // this.loadSettings();
  }

  isAuthorized () {
    return !this.discordBot.isPremium() || this.discordBot.authorizedOwners.includes(this.server.ownerID)
  }

  /**
   * This method loads the settings specific for this server.
   * It also creates a settings file if there isn't one.
   * @returns {undefined}
   * @memberof DiscordServer
   */
  async loadSettings () {
    // If there's no settings file for this server, create one.
    if (!await fs.exists(this.settingsPath)) {
      await fs.writeFile(this.settingsPath, JSON.stringify(DefaultSettings))
    }

    if (!await fs.exists(this.settingsPath)) {
      throw new Error(`Couldn't write settings file: ${this.settingsPath}`)
    }

    // Load the settings file.
    const fileData = await fs.readFile(this.settingsPath)

    if (this.areSettingsLoaded) return

    try {
      this.settings = JSON.parse(fileData)
      this.areSettingsLoaded = true
    } catch (e) {
      console.log(`${this.settingsPath} appears to be corrupted.`)
    }

    if (this.settings.commando != null && this.settings.commando.prefix != null) {
      this.server._commandPrefix = this.settings.commando.prefix
    }

    this.cleanupRankBindings()
  }

  /**
   * Clears the member cache for a specific Discord user.
   * @static
   * @param {Snowflake} id The Discord user id
   * @memberof DiscordServer
   */
  static async clearMemberCache (id) {
    await Cache.set('users', id, null)
  }

  /**
   * Returns a setting value. Tries the saved settings, then tries
   * the default settings.
   * @param {string} key The setting key to get
   * @returns {any} The setting value
   * @memberof DiscordServer
   */
  getSetting (key) {
    if (!this.areSettingsLoaded) {
      throw new Error('Attempt to get a setting from a server whose settings are not loaded')
    }

    if (typeof this.settings[key] !== 'undefined') {
      return this.settings[key]
    } else if (typeof DefaultSettings[key] !== 'undefined') {
      return DefaultSettings[key]
    } else {
      return null
    }
  }

  /**
   * Set a server setting and then save it to disk.
   * @param {string} key The setting key to set
   * @param {any} value The setting value to set
   * @memberof DiscordServer
   */
  async setSetting (key, value) {
    if (!this.areSettingsLoaded) {
      throw new Error('Attempt to change a setting from a server whose settings are not loaded')
    }
    this.ongoingSettingsUpdate = true

    this.settings[key] = value

    const tmpSettingsPath = this.settingsPath + '.tmp'
    await fs.writeFile(tmpSettingsPath, JSON.stringify(this.settings))

    try {
      JSON.parse(await fs.readFile(tmpSettingsPath, 'utf8')) // Throws if file got corrupted
    } catch (e) {
      this.ongoingSettingsUpdate = false
      throw new Error('Atomic save failed: file corrupted. Try again.')
    }

    await fs.rename(tmpSettingsPath, this.settingsPath)
    this.ongoingSettingsUpdate = false
  }

  /**
   * Converts a group binding from the old format to the new format.
   * @static
   * @param {object} binding The binding to convert in the old format
   * @returns {object} The binding in the new format
   * @memberof DiscordServer
   */
  static convertOldBinding (binding) {
    const newBinding = { role: binding.role }

    const ranks = []
    if (binding.operator === 'gt') {
      for (let i = binding.rank; i <= 255; i++) {
        ranks.push(i)
      }
    } else if (binding.operator === 'lt') {
      for (let i = 1; i <= binding.rank; i++) {
        ranks.push(i)
      }
    } else {
      ranks.push(binding.rank)
    }

    newBinding.groups = [
      {
        id: binding.group,
        ranks
      }
    ]

    return newBinding
  }

  /**
   * Fetches and caches a Roblox user's group information.
   * @static
   * @param {int} userid The roblox user id
   * @returns {object} The group information
   * @memberof DiscordServer
   */
  static async getRobloxMemberGroups (userid) {
    let groups = await Cache.get(`bindings.${userid}`, '__groups')
    if (!groups) {
      groups = await request({
        uri: `http://api.roblox.com/users/${userid}/groups`,
        json: true
      })

      if (!groups) {
        throw new Error('Group rank HTTP request is malformed or in unknown format')
      }

      Cache.set(`bindings.${userid}`, '__groups', groups)
    }

    return groups
  }

  /**
   * Checks if a group rank binding passes or fails for
   * a specific Roblox user.
   * @static
   * @param {object} binding The group binding
   * @param {int} userid The roblox user id
   * @param {string} username The roblox username
   * @returns {boolean} The group binding resolution
   * @memberof DiscordServer
   */
  static async resolveGroupRankBinding (binding, userid, username) {
    if (binding.group != null) {
      binding = this.convertOldBinding(binding)
    }

    const bindingHash = Util.md5(JSON.stringify(binding))

    // Check if the return value of this method has already been
    // cached in memory. If so, return that.
    const cachedBinding = await Cache.get(`bindings.${userid}`, bindingHash)
    if (cachedBinding !== null) {
      return cachedBinding
    }

    let returnValue = false

    for (const group of binding.groups) {
      if (VirtualGroups[group.id]) {
        returnValue = await VirtualGroups[group.id]({ id: userid, username }, group.ranks[0], DiscordServer)

        if (returnValue) break
      } else {
        // Check the rank of the user in the Roblox group.
        const groups = await DiscordServer.getRobloxMemberGroups(userid)

        let rank = 0
        for (const groupObj of groups) {
          if (groupObj.Id.toString() === group.id) {
            rank = groupObj.Rank
            break
          }
        }

        returnValue = group.ranks.includes(rank)

        if (returnValue) break
      }
    }

    // Cache the return value in memory.
    Cache.set(`bindings.${userid}`, bindingHash, returnValue)

    return returnValue
  }

  /**
   * Deletes a group rank binding associated with a role id.
   * @param {Snowflake} roleid The role id to clear all bindings that are associated with it.
   * @memberof DiscordServer
   */
  deleteGroupRankBinding (roleid) {
    if (roleid === 'all') {
      return this.setSetting('groupRankBindings', [])
    }

    const rankBindings = this.getSetting('groupRankBindings')

    for (let i = 0; i < rankBindings.length; i++) {
      const binding = rankBindings[i]

      if (binding.role === roleid || roleid === 'all') {
        rankBindings.splice(i, 1)
      }
    }

    this.setSetting('groupRankBindings', rankBindings)
  }

  /**
   * Deletes group bindings that are associated with Discord roles
   * that have been deleted.
   * @param {Channel} [noticeChannel] The channel to post the deletion notice to in a last resort if the owner is unreachable
   * @memberof DiscordServer
   */
  async cleanupRankBindings (lastResortChannel) {
    const verifiedRole = this.getSetting('verifiedRole')
    const unverifiedRole = this.getSetting('verifiedRemovedRole')

    if (verifiedRole && !await this.server.roles.fetch(verifiedRole)) {
      this.setSetting('verifiedRole', null)
      this.announce('Verified Role Deleted', 'Heads up! Looks like you (or someone) has deleted the verified role, so users will no longer get that when they verify.', { important: true, lastResortChannel })
    }

    if (unverifiedRole && !await this.server.roles.fetch(unverifiedRole)) {
      this.setSetting('verifiedRemovedRole', null)
      this.announce('Unverified Role Deleted', 'Heads up! Looks like you (or someone) has deleted the unverified role, so unverified users will no longer receive that role.', { important: true, lastResortChannel })
    }

    for (const binding of this.getSetting('groupRankBindings')) {
      const id = binding.role
      if (!await this.server.roles.fetch(id)) {
        this.deleteGroupRankBinding(id)

        this.announce('Bound Role Deleted', 'Heads up! Looks like you (or someone) has deleted a Discord role that was bound to ' + Util.getBindingText(binding, true), { important: true, lastResortChannel })
      }
    }
  }

  /**
   * Posts an announcement in the server's configured announcement channel.
   * If it's important, the server owner will be notified.
   * @param {string} title The title of the embed message
   * @param {string} text The body of the embed message
   * @param {object} [options={}] Options for the announcement
   * @param {boolean} options.important If this is an important announcement, the server owner will be mentioned or DM'd if no announce channel is set.
   * @memberof DiscordServer
   */
  async announce (title, text, options = {}) {
    const embed = {
      color: options.important ? 0xe74c3c : 0x0064ba,
      title,
      description: text
    }

    if (this.getSetting('announceChannel')) {
      const channel = await this.server.channels.get(this.getSetting('announceChannel'))

      if (channel) {
        try {
          await channel.send(options.important ? `${this.server.owner}` : '', { embed })
          return
        } catch (e) {}
      }
    }

    if (options.important) {
      try {
        await this.server.owner.send(`An important notice was triggered in your server "${this.server.name}" and there is no announcement channel configured, so it has been sent to you here:`, { embed })
        return
      } catch (e) {}

      if (this.server.systemChannel) {
        try {
          await this.server.systemChannel.send(`${this.server.owner} An important notice was triggered and there is no announcement channel configured and the server owner will not accept DMs from RoVer, so it has been posted here:`, { embed })
          return
        } catch (e) {}
      }

      if (options.lastResortChannel) {
        try {
          await options.lastResortChannel.send(`${this.server.owner} An important notice was triggered and there is no announcement channel configured and the server owner will not accept DMs from RoVer, so it has been posted here as a last resort:`, { embed })
        } catch (e) {}
      }
    }
  }

  /**
   * Gets this server's specific welcome message, or the default
   * one if none is configured.
   * @param {object} data String replacement data
   * @returns {string} The processed string
   * @memberof DiscordServer
   */
  getWelcomeMessage (data, member) {
    return Util.formatDataString(this.getSetting('welcomeMessage'), data, member)
  }

  /**
   * Checks to see if this server has configured a custom welcome message.
   * @returns {boolean} True if this server has a custom welcome message
   * @memberof DiscordServer
   */
  hasCustomWelcomeMessage () {
    return DefaultSettings.welcomeMessage !== this.getSetting('welcomeMessage')
  }

  /**
   * Returns a DiscordMember belonging to this DiscordServer.
   * @param {Snowflake} id The id of the user
   * @returns {Promise<DiscordMember>} The new discord member
   * @memberof DiscordServer
   */
  async getMember (id) {
    return DiscordMember.new(this, id)
  }

  /**
   * Returns whether or not a role is in use by the verified, not verified, or binding roles
   *
   * @param {Snowflake} id The role id
   * @returns {boolean} True if the role is in use
   * @memberof DiscordServer
   */
  isRoleInUse (id) {
    if (this.getSetting('verifiedRole') === id) return true
    if (this.getSetting('verifiedRemovedRole') === id) return true

    for (const binding of this.getSetting('groupRankBindings')) {
      if (binding.role === id) return true
    }

    return false
  }
}

module.exports = DiscordServer
