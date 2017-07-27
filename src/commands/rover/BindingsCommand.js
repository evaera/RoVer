const Command = require('../Command')

module.exports =
class BindingsCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'bindings',
            aliases: ['listbindings', 'roverbindings'],
            description: "Displays a list of bound roles",
        });
    }

    async fn(msg) {
        if (this.server.getSetting('verifiedRole')) {
            let id = this.server.getSetting('verifiedRole');
            msg.reply({ embed: {
                color: 0x2ecc71,
                title: "Verified role",
                fields: [
                    { name: "Role name", value: this.server.server.roles.get(id).name, inline: true },
                    { name: "Role id", value: id, inline: true },
                ]
            }});
        }

        if (this.server.getSetting('verifiedRemovedRole')) {
            let id = this.server.getSetting('verifiedRemovedRole');
            msg.reply({ embed: {
                color: 0xe74c3c,
                title: "Not Verified role",
                fields: [
                    { name: "Role name", value: this.server.server.roles.get(id).name, inline: true },
                    { name: "Role id", value: id, inline: true },
                ]
            }});
        }

        for (let binding of this.server.getSetting('groupRankBindings')) {
            let id = binding.role;
            if (binding.group.match(/[a-z]/i)) {
                msg.reply({ embed: {
                    color: 0xe67e22,
                    fields: [
                        { name: "Group", value: binding.group, inline: true },
                        { name: "Argument", value: binding.rank, inline: true },
                        { name: "Role name", value: this.server.server.roles.get(id).name, inline: true },
                        { name: "Role id", value: id, inline: true },
                    ]
                }});
            } else {
                msg.reply({ embed: {
                    color: 0xe67e22,
                    fields: [
                        { name: "Group", value: binding.group, inline: true },
                        { name: "Rank", value: binding.rank, inline: true },
                        { name: "Comparison", value: binding.operator, inline: true },
                        { name: "Role name", value: this.server.server.roles.get(id).name, inline: true },
                        { name: "Role id", value: id, inline: true },
                    ]
                }});
            }
        }
    }
}
