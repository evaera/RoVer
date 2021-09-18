const Command = require("../Command");

module.exports = class UnverifyCommand extends Command {
  constructor(client) {
    super(client, {
      name: "unverify",
      properName: "Unverify",
      description: "Displays instructions on how to unverify",
      aliases: ["unlink"],
      userPermissions: [],
    });
  }

  async fn(msg) {
    msg.author
      .send(
        "Before we get started, you do **not** need to be unverified to verify as a new account, to reverify, head to <https://rover.link/verify> and verify with the new account. \n\nTo unverify, you need to head to our support server at https://discord.gg/7yfwrat and ask one of the moderators to handle your unverification."
      )
      .then(() => {
        msg.reply("Sent you a DM with information.");
      })
      .catch(() => {
        msg.reply(
          "I can't seem to message you - please make sure your DMs are enabled!"
        );
      });
  }
};
