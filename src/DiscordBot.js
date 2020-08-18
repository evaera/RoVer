const path = require('path')
const Discord = require('discord.js-commando')
const request = require('request-promise')
const config = require('./data/client.json')
const DiscordServer = require('./DiscordServer')
const { Cache } = require('./GlobalCache')
const requestDebug = require('request-debug')
const SettingProvider = require('./commands/SettingProvider')
const Util = require('./Util')
const fs = require('mz/fs')

if (config.loud) requestDebug(request, (type, data) => console.log(`${type} ${data.debugId} : ${data.uri || data.statusCode}`))

/**
 * The main Discord bot class, only one per shard.
 * @class DiscordBot
 */
class DiscordBot {
  constructor () {
    this.initialize()
    this.servers = {}
    this.authorizedOwners = []
    this.patronTransfers = {}
    this.blacklist = {}
  }

  /**
   * Initialize the bot, hook up events, and log in.
   * @memberof DiscordBot
   */
  initialize () {
    this.bot = new Discord.Client({
      apiRequestMethod: config.apiRequestMethod || 'sequential',
      disabledEvents: ['TYPING_START', 'VOICE_STATE_UPDATE', 'PRESENCE_UPDATE', 'MESSAGE_DELETE', 'MESSAGE_UPDATE', 'CHANNEL_PINS_UPDATE', 'MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE', 'MESSAGE_REACTION_REMOVE_ALL', 'CHANNEL_PINS_UPDATE', 'MESSAGE_DELETE_BULK', 'WEBHOOKS_UPDATE'],
      owner: config.owner || '0',
      commandPrefix: config.commandPrefix || '!',
      unknownCommandResponse: false,
      disableMentions: 'everyone',
      messageCacheMaxSize: 0,
      retryLimit: 0
    })

    this.bot.setProvider(new SettingProvider())

    // Instantiate the shard's Cache singleton to interface with the main process.
    // A global variable is used here because the cache is dependent on the client
    // being initialized, but I don't like the idea of having to pass down the cache
    // from this object into every instance (DiscordMember, DiscordServer). This seemed
    // like the best solution.
    global.Cache = new Cache(this.bot)
    this.shardClientUtil = global.Cache.shardClientUtil

    // Set a reference to this instance inside of the client
    // for use in Commando modules. Is this bad? Probably.
    this.bot.discordBot = this

    // Events

    // We use .bind(this) so that the context remains within
    // the class and not the event.
    this.bot.on('ready', this.ready.bind(this))
    this.bot.on('guildMemberAdd', this.guildMemberAdd.bind(this))

    this.bot.on('message', this.message.bind(this))

    this.bot.on('invalidated', () => { // This should never happen!
      console.error(`Sesson on shard ${this.bot.shard.ids[0]} invalidated - exiting!`)
      process.exit(0)
    })
    
    if (config.loud) {
      this.bot.on('error', (message) => console.log(message))
      process.on('unhandledRejection', (reason, promise) => {
        console.log('Unhandled rejection at:', promise, 'reason:', reason)
      })
    }

    this.bot.dispatcher.addInhibitor(msg => {
      if (!msg.guild) {
        return
      }

      if (this.blacklist[msg.guild.ownerID]) {
        msg.reply("This server is blacklisted!")
        return 'blacklisted'
      }
    })

    if (this.isPremium()) {
      this.bot.dispatcher.addInhibitor(msg => {
        if (msg.guild && !this.authorizedOwners.includes(msg.guild.ownerID)) {
          if (this.authorizedOwners.length === 0) {
            msg.reply('Sorry, the authorized users list is still being downloaded. This occurs when the bot has recently restarted. Please wait a few seconds and try again.')
          } else {
            msg.reply(`Sorry, this server isn't authorized to use RoVer Plus.${msg.member.hasPermission(['MANAGE_GUILD']) ? ' The server owner needs to donate at <https://www.patreon.com/erynlynn>, or you can invite the regular RoVer bot at <https://RoVer.link>.' : ''}`) // notify sender to donate only if they're an "admin"
          }

          return 'not_premium'
        }
      })

      this.updatePatrons()

      setInterval(() => {
        const beforePatrons = this.authorizedOwners
        this.updatePatrons().catch((updateError) => {
          console.error(`Patron update failed! ${updateError}`)

          this.authorizedOwners = beforePatrons
        })
      }, 5 * 60 * 1000)
    }

    // Register commands
    this.bot.registry
      .registerGroup('rover', 'RoVer')
      .registerDefaultTypes()
      .registerDefaultGroups()
      .registerDefaultCommands({
        ping: false,
        commandState: false,
        prefix: true,
        help: true,
        unknownCommand: false
      })
      .registerCommandsIn(path.join(__dirname, 'commands'))

    // Login.
    this.bot.login(process.env.CLIENT_TOKEN)

    this.updateBlacklist().catch(console.error)
  }

  isPremium () {
    return !!config.patreonAccessToken
  }

  async updateBlacklist () {
    if (!config.banServer) {
      return false
    }

    const response = await request(`https://discord.com/api/v6/guilds/${config.banServer}/bans`, {
      json: true,
      headers: {
        Authorization: `Bot ${config.token}`
      }
    })

    response.forEach(ban => {
      this.blacklist[ban.user.id] = true
    })
  }

  async updatePatrons (page, newAuthorizedOwners) {
    if (!page) {
      newAuthorizedOwners = []
    }

    const transferFilePath = path.join(__dirname, './data/transfers.csv')

    if (await fs.exists(transferFilePath)) {
      const contents = await fs.readFile(transferFilePath, {
        encoding: 'utf8'
      })

      this.patronTransfers = contents.split(/\n\r?/)
        .map(line => line.split(','))
        .reduce((a, transfer) => {
          a[transfer[0]] = transfer[1]
          return a
        }, {})
    }

    const url = page || `https://www.patreon.com/api/oauth2/api/campaigns/${config.patreonCampaignId}/pledges?include=patron.null`

    const response = await request(url, {
      json: true,
      headers: {
        Authorization: `Bearer ${config.patreonAccessToken}`
      }
    })

    newAuthorizedOwners = [
      config.owner || '0',
      ...(config.patreonOverrideOwners || []),
      ...newAuthorizedOwners,
      ...(
        response.data.filter(pledge => (
          pledge.attributes.declined_since === null
        )).map(pledge => (
          response.included.find(include => include.id === pledge.relationships.patron.data.id)
        )).filter(include => (
          include.attributes.social_connections &&
          include.attributes.social_connections.discord
        )).map(include => (
          include.attributes.social_connections.discord.user_id
        ))
      )
    ].map(id => this.patronTransfers[id] || id)

    if (response.links && response.links.next) {
      return this.updatePatrons(response.links.next, newAuthorizedOwners)
    } else {
      this.authorizedOwners = newAuthorizedOwners
    }
  }

  /**
   * Called when the bot is ready and has logged in.
   * @listens Discord.Client#ready
   * @memberof DiscordBot
   */
  ready () {
    console.log(`Shard ${this.bot.shard.ids[0]} is ready, serving ${this.bot.guilds.cache.array().length} guilds.`)

    // Set status message to the default until we get info from master process
    this.setActivity()
  }

  /**
   * This method is called when a user sends a message, but it's used
   * for setting their nickname back to what it should be if they've
   * changed it. Only active if lockNicknames is true in config.
   * @listens Discord.Client#message
   * @param {Message} message The new message.
   * @memberof DiscordBot
   */
  async message (message) {
    // Don't want to do anything if this is a DM or message was sent by the bot itself.
    // Additionally, if the message is !verify, we don't want to run it twice (since it
    // will get picked up by the command anyway)
    if (!message.guild || message.author.id === this.bot.user.id || message.cleanContent.toLowerCase() === message.guild.commandPrefix + 'verify' || message.author.bot) {
      return
    }

    // We call discordMember.verify but we want to retain the cache
    // and we don't want it to post any announcements.
    const server = await this.getServer(message.guild.id)
    const member = await server.getMember(message.author.id)
    if (!member) return

    // If this is the verify channel, we want to delete the message and just verify the user if they aren't an admin.
    if (server.getSetting('verifyChannel') === message.channel.id && message.cleanContent.toLowerCase() !== message.guild.commandPrefix + 'verify' && !(this.bot.isOwner(message.author) || message.member.hasPermission('MANAGE_GUILD') || message.member.roles.cache.find(role => role.name === 'RoVer Admin'))) {
      if (message.channel.permissionsFor(message.guild.me).has('MANAGE_MESSAGES')) {
        message.delete().catch(console.error)
      }
      return member.verify({ message })
    }

    if (!config.disableAutoUpdate && member.shouldUpdateNickname(message.member.displayName) && config.lockNicknames) {
      // As a last resort, we just verify with cache on every message sent.
      await member.verify({
        announce: false,
        clearBindingsCache: false
      })
    }
  }

  /**
   * This is called when a user joins any Discord server.
   * @listens Discord.Client#guildMemberAdd
   * @param {GuildMember} member The new guild member
   * @memberof DiscordBot
   */
  async guildMemberAdd (member) {
    if (member.user.bot) return

    const server = await this.getServer(member.guild.id)

    if (server.getSetting('joinDM') === false) {
      return
    }

    const discordMember = await server.getMember(member.id)
    if (!member) return
    const action = await discordMember.verify()

    try {
      if (action.status) {
        member.send(server.getWelcomeMessage(action, member)).catch(() => {})
      } else if (!action.status && action.nonFatal) {
        member.send(`Welcome to ${member.guild.name}! You are already verified, but something went wrong when updating your roles. Try running \`${member.guild.commandPrefix}verify\` in the server for more information.`).catch(() => {})
      } else {
        member.send(`Welcome to ${member.guild.name}! This Discord server uses a Roblox account verification system to keep our community safe. Verifying your account is quick and safe and doesn't require any information other than your username. All you have to do is either join a game or put a code in your profile, and you're in!\n\nVisit the following link to verify your Roblox account: ${Util.getVerifyLink(member.guild)}`).catch(() => {})
      }
    } catch (e) {}
  }

  /**
   * Sets the bot's status text.
   * @param {string} text The status message.
   * @param {string} activityType The activity type.
   * @memberof DiscordBot
   */
  setActivity (text, activityType) {
    if (!this.bot || !this.bot.user) return

    this.bot.user.setActivity(text || 'http://eryn.io/RoVer', { type: activityType })
  }

  /**
   * This is used to get the DiscordServer instance associated
   * with the specific guild id.
   * @param {Snowflake} id Guild id
   * @returns {Promise<DiscordServer>} DiscordServer
   * @memberof DiscordBot
   */
  async getServer (id) {
    if (!this.servers[id]) {
      this.servers[id] = new DiscordServer(this, id)
      await this.servers[id].loadSettings()
    } else if (!this.servers[id].areSettingsLoaded) {
      await this.servers[id].loadSettings()
    }
    return this.servers[id]
  }

  /**
   * This is called by the update server when a user verifies
   * online. It updates the member in every DiscordServer they
   * are in.
   * @param {object} args An object with keys `id` (string) and `guilds` (array)
   * @memberof DiscordBot
   */
  async globallyUpdateMember (args) {
    const { id, guilds } = args

    // Start off by clearing their global cache.
    await DiscordServer.clearMemberCache(id)

    let firstRun = true

    // Iterate through all of the guilds the bot is in.
    for (const guildId of guilds) {
      try {
        if (!this.bot.guilds.has(guildId)) continue

        const guild = this.bot.guilds.resolve(guildId)
        const server = await this.getServer(guild.id)

        const member = await server.getMember(id)
        if (!member) continue
        const action = await member.verify({
          // We want to clear the group rank bindings cache because
          // this is the first iteration.
          clearBindingsCache: firstRun
        })

        if (!action.status && !action.nonFatal) {
          // If there's a fatal error, don't continue with the rest.
          break
        } else if (action.status && server.hasCustomWelcomeMessage()) {
          // It worked, checking if there's a custom welcome message.
          await this.bot.users.fetch(id)

          const guildMember = await this.bot.guilds.resolve(guild.id).members.fetch(id)
          guildMember.send(server.getWelcomeMessage(action, guildMember)).catch(() => {})
        }

        firstRun = false
      } catch (e) {
        continue
      }
    }
  }
}

module.exports = DiscordBot
