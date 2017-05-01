const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')

module.exports =
class VerifiedRoleCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'verifiedrole',
            aliases: ['roververifiedrole'],
            description: "`<Discord Role>` Set the role that verified members will get. Default none",
            
            args: [
                {
                    key: 'role',
                    label: 'role',
                    prompt: "What role should verified members get?",
                    type: 'role',
                    default: false,
                }
            ]
        });
    }

    async fn(msg, args, pattern) {
        let role = args.role;
        if (role) {
            this.server.setSetting('verifiedRole', role.id);
            msg.reply(`Set verified role to ${role.name}`);
        } else {
            this.server.setSetting('verifiedRole', null);
            msg.reply("Cleared verified role, users will no longer receive a role when they verify.");
        }
    }
}