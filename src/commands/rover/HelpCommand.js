const Command = require('../Command')

module.exports =
class HelpCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'roverhelp',
            aliases: ['rover'],
            description: "Displays a list of commands",
        });
    }

    async fn(msg) {
        let commandGroup = this.client.registry.groups.get('rover');
        msg.reply(commandGroup.commands.map(cmd => `**!${cmd.name}:** ${cmd.description}`).join('\n\n'));
    }
}