const Command = require('../Command')

module.exports =
class HelpCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'ping',
      properName: 'RoVer',
      description: 'Ping the bot to see API latency'
    })
  }

  async fn (msg) {
   
    const start = Date.now()
    message.channel.send("Pinging...").then(message => {
        const end = Date.now()
        message.edit(`:ping_pong: Pong! Took **${(end - start)}**ms`);
    })

  }
}
