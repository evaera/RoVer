const Command = require('../Command')

module.exports =
class HelpCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'unknown',
      properName: 'unknown',
      unknown: true,
      hidden: true
    })
  }

  async fn (msg) {
    // This command exists to disable Commando's unknown command messages.
  }
}
