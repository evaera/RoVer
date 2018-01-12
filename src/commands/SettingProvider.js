class SettingProvider {
  async init (client) {
    this.bot = client.discordBot

    client.on('commandPrefixChange', (guild, prefix) => {
      this.set(guild, 'prefix', prefix)
    })

    for (let guild of client.guilds.values()) {
      let prefix = await this.get(guild, 'prefix')
      if (prefix) {
        guild._commandPrefix = prefix
      }
    }
  }

  async getSettings (guild) {
    return (await this.bot.getServer(guild.id)).getSetting('commando') || {}
  }

  async setSettings (guild, settings) {
    await (await this.bot.getServer(guild.id)).setSetting('commando', settings)
  }

  async clear (guild) {
    return this.setSettings(guild, undefined)
  }

  async get (guild, key, defaultValue) {
    let settings = await this.getSettings(guild)

    return settings[key] || defaultValue
  }

  async set (guild, key, value) {
    let settings = await this.getSettings(guild)

    settings[key] = value

    return this.setSettings(guild, settings)
  }
}

module.exports = SettingProvider
