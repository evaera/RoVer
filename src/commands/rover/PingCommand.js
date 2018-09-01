const Command = require('../Command')

module.exports =
class PingCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'ping',
      properName: 'Ping',
      description: 'Ping the bot to see API latency'
    })
  }
  async fn (msg) {
    msg.channel.send('Pinging...').then(message => {
      message.edit(`:ping_pong: Pong! Took **${message.createdTimestamp - msg.createdTimestamp}ms**`)
    })
  }
}
