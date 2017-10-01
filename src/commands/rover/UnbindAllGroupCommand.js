const Command = require('../Command')

module.exports =
class UnbindAllGroupCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'unbindallranks',
      aliases: ['roverunbindallgroupranks', 'unbindallgroupranks'],
      description: 'Unbind all group rank'
    })
  }

  async fn (msg) {
    this.server.deleteGroupRankBinding('all')
    msg.reply('Deleted all group rank bindings.')
  }
}
