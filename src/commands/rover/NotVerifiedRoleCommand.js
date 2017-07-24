const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')

module.exports =
class NotVerifiedRoleCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'notverifiedrole',
            aliases: ['roververifiedremovedrole', 'verifiedremovedrole', 'rovernotverifiedrole'],
            description: "`<Discord Role>` Set the role that members will lose when verified successfully. Default none",
            
            args: [
                {
                    key: 'role',
                    label: 'role',
                    prompt: "What role should non-verified users get?",
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
            msg.reply(`Set non-verified role to ${role.name}`);
        } else {
            this.server.setSetting('verifiedRemovedRole', null);
            msg.reply("Cleared removed verification role, users will no longer be removed from it on verification.");
        }
    }
}
