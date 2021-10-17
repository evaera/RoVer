const Command = require("../Command")

module.exports = class UnverifyCommand extends Command {
  constructor(client) {
    super(client, {
      name: "unverify",
      properName: "Unverify",
      description: "Displays instructions on how to unverify",
      aliases: ["unlink"],
      userPermissions: [],
    })
  }

  async fn(msg) {
    msg.author
      .send(
        "To unverify, visit https://rover.link/verify and click on **Remove**.",
      )
      .then(() => {
        msg.reply("Sent you a DM with information.")
      })
      .catch(() => {
        msg.reply(
          "I can't seem to message you - please make sure your DMs are enabled!",
        )
      })
  }
}
