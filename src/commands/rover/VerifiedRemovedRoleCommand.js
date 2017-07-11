const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')

module.exports =
class VerifiedRemovedRoleCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'verifiedremovedrole',
            aliases: ['roververifiedremovedrole'],
            description: "`<Discord Role>` Set the role that members will lose when verified successfully. Default none",
            
            args: [
                {
                    key: 'role',
                    label: 'role',
                    prompt: "What role should verified be removed from?",
                    type: 'role',
                    default: false,
                }
            ]
        });
    }

    async fn(msg, args, pattern) {
        let role = args.role;
        if (role) {
            this.server.setSetting('verifiedRemovedRole', role.id);
            msg.reply(`Set role removed on verification to ${role.name}`);
        } else {
            this.server.setSetting('verifiedRole', null);
            msg.reply("Cleared removed verification role, users will no longer be removed from it on verification.");
        }
    }
}