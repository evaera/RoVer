const Command = require("../Command")
const Accolades = require("../../Accolades.json")

module.exports = class SubscriptionCommand extends Command {
  constructor(client) {
    super(client, {
      name: "subscription",
      properName: "Subscription",
      aliases: ["recheck"],
      description: "Rechecks and displays  premium status",
      throttling: { usages: 1, duration: 30 },
    })
  }

  hasPermission(msg) {
    return (
      msg.member.hasPermission(["MANAGE_GUILD"]) ||
      this.client.isOwner(msg.author) ||
      (Accolades[msg.author.id] &&
        Accolades[msg.author.id].match("Support Staff"))
    )
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
