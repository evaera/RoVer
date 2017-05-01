const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')

module.exports =
class BindGroupCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'bindgrouprank',
            aliases: ['roverbindgrouprank', 'bindgroup', 'bindrank', 'roverbind'],
            description: "`<roblox group id> <Discord Role> <((>|<|)group rank|\"all\")>` Binds Roblox group membership or group rank to a Discord role. Last argument can be either the required rank number (from Roblox group admin page), or the word `all` to indicate all group members. If you choose to use rank number, you can also use operators: `>` will match all members who have a rank **greater than or equal to** the given rank, and `<` will match all members who have a rank **less than** the given rank. If you exclude the operator, an exact rank number match is used.",
            
            args: [
                {
                    key: 'group',
                    prompt: "Group",
                    type: 'string'
                },
                {
                    key: 'role',
                    prompt: "Role",
                    type: 'role'
                },
                {
                    key: 'rank',
                    prompt: "Rank",
                    type: 'string',
                    default: 'all'
                }
            ]
        });
    }

    async fn(msg, args) {
        let binding = {};

        // Support for operators, so we parse them out before
        // saving the rank number.
        let rankUnparsed = args.rank;
        let all = false;

        if (rankUnparsed === 'all') {
            rankUnparsed = '>1';
            all = true;
        }

        if (rankUnparsed.startsWith('>')) {
            binding.operator = 'gt';
            rankUnparsed = rankUnparsed.substring(1);
        } else if (rankUnparsed.startsWith('<')) {
            binding.operator = 'lt';
            rankUnparsed = rankUnparsed.substring(1);
        }

        binding.group = args.group;
        binding.rank = parseInt(rankUnparsed, 10);
        binding.role = args.role.id;

        // Delete any previous binding with that role.
        this.server.deleteGroupRankBinding(binding.role);

        // Add the new binding.
        let serverBindings = this.server.getSetting('groupRankBindings');
        serverBindings.push(binding);
        this.server.setSetting('groupRankBindings', serverBindings);

        if (!all) {
            msg.reply(`Added rank binding: Group: ${binding.group}, Rank: ${binding.rank || 'none'}, Role: ${args.role.name}, Comparison: ${binding.operator || 'eq'}`);
        } else {
            msg.reply(`Added rank binding for all members in group: Group: ${binding.group}, Role: ${args.role.name}`);
        }
    }
}