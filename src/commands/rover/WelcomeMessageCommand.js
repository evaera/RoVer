const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')

module.exports =
class WelcomeMessageCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'welcomemessage',
            aliases: ['roverwelcomemessage'],
            description: "`<Message>` Set the message the user gets when they verify. Will be sent in DMs unless they use !verify command. Available replacements are Available replacements are %USERNAME%, %USERID%, %DISCORDNAME%, and %DISCORDID%. Default: Welcome to the server, %USERNAME%!.",
            
            args: [
                {
                    key: 'message',
                    label: 'message',
                    prompt: "Welcome message",
                    type: 'string',
                    infinite: true,
                    default: false
                }
            ]
        });
    }

    async fn(msg, args) {
        if (args.message) {
            args.message = args.message.join(' ');
            this.server.setSetting('welcomeMessage', args.message);
            msg.reply(`Set welcome message to \`${args.message}\``);
        } else {
            this.server.setSetting('welcomeMessage', undefined);
            msg.reply("Set welcome message back to default");
        }
    }
}