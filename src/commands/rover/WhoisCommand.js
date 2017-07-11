const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')
const request = require('request-promise')
const config = require('../../data/client.json')

module.exports =
class WhoisCommand extends Command {
    constructor(client) {
        super(client, {
            name: 'roblox',
            aliases: ['whois'],
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
			msg.channel.startTyping();
			
			let username = await request({
				uri: `https://api.roblox.com/users/${data.robloxId}`,
				json: true,
				simple: false
			});
			
			if (username == null) 
			{
				username = data.robloxUsername;
			} else {
				username = username.Username;
			}
			
            var RAP = "RAP not enabled";
            if (config.showRAP == true) {
                RAP = await DiscordServer.getRAP(data.robloxId, true);
            }
			
			
            msg.reply({"embed":{
                "url": "https://discordapp.com",
                "color": 25786,
                "footer": {
                "icon_url": "https://puu.sh/wupPh/f2cb97f3d1.png",
                    "text": ""
                },
                "author": {
                    "name": `${username}`,
                    "url": `https://www.roblox.com/users/${data.robloxId}/profile`,
                    "icon_url": `https://www.roblox.com/headshot-thumbnail/image?userId=${data.robloxId}&width=420&height=420&format=png`
                },
                "fields": [
                    {
                        "name": "User ID",
                        "value": `${data.robloxId}`,
                        "inline": true
                    },
                    {
                        "name": "Profile Link",
                        "value": `https://www.roblox.com/users/${data.robloxId}/profile`,
                        "inline": true
                    },
					{
						"name": "RAP",
						"value": `${RAP}`,
						"inline": true
					}
                ]
            }});
			msg.channel.stopTyping();
        } else {
            msg.reply(`${member.displayName} doesn't seem to be verified.`)
        }
    }
    }
}
