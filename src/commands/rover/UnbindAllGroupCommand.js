const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')

module.exports =
class UnbindAllGroupCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'unbindallgroupranks',
            aliases: ['roverunbindallgroupranks'],
            description: "Unbind all group rank",
        });
    }

    async fn(msg, args) {
        this.server.deleteGroupRankBinding('all');
        msg.reply("Deleted all group rank bindings.");
    }
}