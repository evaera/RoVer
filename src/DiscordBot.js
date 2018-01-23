const path = require('path')
const Discord = require('discord.js-commando')
const request = require('request-promise')
const config = require('./data/client.json')
const DiscordServer = require('./DiscordServer')
const {Cache} = require('./GlobalCache')
const requestDebug = require('request-debug')
const SettingProvider = require('./commands/SettingProvider')
const Util = require('./Util')

if (config.loud) requestDebug(request, (type, data) => console.log(`${type} ${data.debugId} : ${data.uri || data.statusCode}`))

/**
 * The main Discord bot class, only one per shard.
 * @class DiscordBot
 */
class DiscordBot {
  constructor () {
    this.initialize()
    this.servers = {}
  }

  /**
   * Initialize the bot, hook up events, and log in.
   * @memberof DiscordBot
   */
  initialize () {
    this.bot = new Discord.Client({
      shardId: parseInt(process.env.SHARD_ID, 10),
      shardCount: parseInt(process.env.SHARD_COUNT, 10),
      apiRequestMethod: config.apiRequestMethod || 'sequential',
      disabledEvents: ['TYPING_START', 'VOICE_STATE_UPDATE', 'PRESENCE_UPDATE', 'MESSAGE_DELETE', 'MESSAGE_UPDATE'],
      owner: config.owner || '0',
      commandPrefix: config.commandPrefix || '!',
      unknownCommandResponse: false
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
    if (config.loud) this.bot.on('error', (message) => console.log(message))

    // Only hook up if lockNicknames mode is enabled.
    if (config.lockNicknames) {
      this.bot.on('message', this.message.bind(this))
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
        help: false
      })
      .registerCommandsIn(path.join(__dirname, 'commands'))

    // Login.
    this.bot.login(process.env.CLIENT_TOKEN)
  }

  /**
   * Called when the bot is ready and has logged in.
   * @listens Discord.Client#ready
   * @memberof DiscordBot
   */
  ready () {
    console.log(`Shard ${process.env.SHARD_ID} is ready, serving ${this.bot.guilds.array().length} guilds.`)

    let currentActivity = 0
    let totalUsers = null

    request('https://verify.eryn.io/api/count')
      .then(count => {
        totalUsers = (parseInt(count, 10) / 1000).toFixed(1) + 'K'
      })

    setInterval(async () => {
      currentActivity++
      if (currentActivity === 2 && totalUsers == null) currentActivity++

      if (currentActivity > 3) {
        currentActivity = 0
      }

      switch (currentActivity) {
        case 0:
          this.bot.user.setActivity('http://eryn.io/RoVer')
          break
        case 1:
          let totalGuilds = (await this.shardClientUtil.fetchClientValues('guilds.size')).reduce((prev, val) => prev + val, 0)
          this.bot.user.setActivity(`${totalGuilds} servers`, { type: 'WATCHING' })
          break
        case 2:
          this.bot.user.setActivity(`${totalUsers} users`, { type: 'LISTENING' })
          break
        case 3:
          this.bot.user.setActivity('!rover', { type: 'LISTENING' })
          break
      }
    }, 15000)

    this.bot.user.setActivity('http://eryn.io/RoVer')
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
    let server = await this.getServer(message.guild.id)
    let member = await server.getMember(message.author.id)
    if (!member) return

    if (server.getSetting('verifyChannel') === message.channel.id && message.cleanContent.toLowerCase() !== message.guild.commandPrefix + 'verify') {
      message.delete()
      return member.verify({ message })
    }

    await member.verify({
      announce: false,
      clearBindingsCache: false
    })
  }

  /**
   * This is called when a user joins any Discord server.
   * @listens Discord.Client#guildMemberAdd
   * @param {GuildMember} member The new guild member
   * @memberof DiscordBot
   */
  async guildMemberAdd (member) {
    if (member.user.bot) return

    let server = await this.getServer(member.guild.id)

    if (server.getSetting('joinDM') === false) {
      return
    }

    let discordMember = await server.getMember(member.id)
    if (!member) return
    let action = await discordMember.verify()

    try {
      if (action.status) {
        member.send(server.getWelcomeMessage(action, member))
      } else if (!action.status && action.nonFatal) {
        member.send(`Welcome to ${member.guild.name}! You are already verified, but something went wrong when updating your roles. Try running \`${member.guild.commandPrefix}verify\` in the server for more information.`)
      } else {
        member.send(`Welcome to ${member.guild.name}! This Discord server uses a Roblox account verification system to keep our community safe. Verifying your account is quick and safe and doesn't require any information other than your username. All you have to do is either join a game or put a code in your profile, and you're in!\n\nVisit the following link to verify your Roblox account: ${Util.getVerifyLink(member.guild)}`)
      }
    } catch (e) {}
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
    let {id, guilds} = args

    // Start off by clearing their global cache.
    DiscordServer.clearMemberCache(id)

    let firstRun = true

    // Iterate through all of the guilds the bot is in.
    for (let guildId of guilds) {
      try {
        if (!this.bot.guilds.has(guildId)) continue

        let guild = this.bot.guilds.get(guildId)
        let server = await this.getServer(guild.id)

        let member = await server.getMember(id)
        if (!member) continue
        let action = await member.verify({
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

          let guildMember = await this.bot.guilds.get(guild.id).members.fetch(id)
          guildMember.send(server.getWelcomeMessage(action, guildMember))
        }

        firstRun = false
      } catch (e) {
        continue
      }
    }
  }
}

module.exports = DiscordBot
