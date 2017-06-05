const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')
const request = require('request-promise')

module.exports =
class WhoisCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'whois',
            aliases: ['roblox'],
            userPermissions: [],
            description: "<person> Get a verified person's ROBLOX & profile link.",
            
            args: [
                {
                    key: 'member',
                    label: 'member',
                    prompt: "What is their username?",
                    type: 'member',
                    default: false,
                }
            ]
        });
    }

    async fn(msg, args) {
    let member = args.member;
    let data = {};
    let id = member.user.id;
    if (member) { // If the member specified exists,
        try {
            // Read user data from memory, or request it if there isn't any cached.
            data = DiscordServer.DataCache[member.user.id] || await request({
                uri: `https://verify.eryn.io/api/user/${id}`,
                json: true,
                simple: false
            })
        } catch (e) {
            console.log(e);
            return msg.reply("An error occured while fetching that user's data.")
        }
        if (data.status === "ok"){
            // Make sure the data is cached so we don't have to use the API in the future
            DiscordServer.DataCache[id] = data;
            msg.reply(`${member.displayName}: https://www.roblox.com/users/${data.robloxId}/profile`);
        } else {
            msg.reply(`${member.displayName} doesn't seem to be verified.`)
        }
    }
    }
}
