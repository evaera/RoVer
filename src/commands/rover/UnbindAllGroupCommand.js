const Command = require('../Command')

module.exports =
class UnbindAllGroupCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'unbindall',
      aliases: ['roverunbindallgroupranks', 'unbindallgroupranks', 'unbindallranks'],
      description: 'Unbind all group rank'
    })
  }

  async fn (msg) {
    this.server.deleteGroupRankBinding('all')
    msg.reply('Deleted all group rank bindings.')
  }
}
