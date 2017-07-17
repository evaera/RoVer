const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')

module.exports =
class UpdateCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'update',
            aliases: ['roverupdate'],
            description: "`<Discord User>` Forcibly update verification status of a user, same as them running !verify. Make sure you @mention the user.",
            
            args: [
                {
                    key: 'user',
                    prompt: "User to update",
                    type: 'user',
                }
            ]
        });
    }

    async fn(msg, args) {
        let user = args.user;
        DiscordServer.clearMemberCache(user.id);

        let server = await this.discordBot.getServer(msg.guild.id)
        let action = await (await server.getMember(msg.author.id)).verify();

        if (!action.status) {
            msg.reply(action.error);
        } else {
            msg.reply(`${action.robloxUsername} verified.`);
        }
    }
}