const Command = require('../Command')

module.exports =
class PingCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'ping',
      properName: 'Ping',
      description: 'Ping the bot to see API latency',
      userPermissions: [],
      throttling: { usages: 1, duration: 10 } // 1 usage every 10 seconds
    })
  }

  async fn (msg) {
    const start = Date.now()
    msg.channel.send('Pinging...').then(message => {
      message.edit(`:ping_pong: Pong! Took **${Math.ceil(Date.now() - start)}ms**`)
    })
  }
}
