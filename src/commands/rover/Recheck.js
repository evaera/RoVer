const Command = require("../Command")

module.exports = class RecheckCOmmand extends Command {
  constructor(client) {
    super(client, {
      name: "recheck",
      properName: "Recheck",
      aliases: [],
      description: "Rechecks premium status",
      throttling: { usages: 1, duration: 30 },
    })
  }

  async fn(msg) {
    if (!this.server.discordBot.isPremium()) {
      return msg.reply("This command can only be used on RoVer Plus")
    }

    await this.server.checkPremium()
    msg.reply(
      `Premium: ${this.server.premium}. Reason: ${this.server.premiumReason}`,
    )
  }
}
