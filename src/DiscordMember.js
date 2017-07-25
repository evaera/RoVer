const config        = require('./data/client.json')
const Util          = require('./Util')

const request       = require('request-promise').defaults({pool: {maxSockets: Infinity}});

let DiscordServer;

module.exports =
// A representation of a Discord guild member.
class DiscordMember {
    constructor(discordServer, id) {
        this.discordServer = discordServer;
        this.id = id;

        this.bot = this.discordServer.bot;
        this.server = this.discordServer.server;

        // Have to do this to prevent circular reference in file requires
        // Gets a reference to DiscordServer so we can run static methods
        DiscordServer = this.discordServer.constructor;
    }

    static async new(discordServer, id) {
        let discordMember = new DiscordMember(discordServer, id);

        if (!discordMember.prepareMember()) {
            return false;
        }

        return discordMember;
    }

    // Clears the member cache for a specific Discord user.
    clearCache() {
        if (DiscordServer.DataCache) {
            delete DiscordServer.DataCache[this.id];
        }
    }

    async prepareMember() {
        try {
            this.user = await this.bot.fetchUser(this.id, false);
            this.member = await this.server.fetchMember(this.user, false);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Gets a member's nickname, formatted with this server's
    // specific settings.
    getNickname(data) {
        return Util.formatDataString(this.discordServer.getSetting('nicknameFormat'), data, this.member);
    }

    // This method is called to update the state of a specific member
    // in this Discord server.
    async verify(options) {
        var options = options || {};
        let data = {};

        if (!this.member && !await this.prepareMember()) {
            return {
                status: false,
                error: "User not in guild."
            }
        }

        try {
            // Read user data from memory, or request it if there isn't any cached.
            data = DiscordServer.DataCache[this.id] || await request({
                uri: `https://verify.eryn.io/api/user/${this.id}`,
                json: true,
                simple: false
            });
        } catch (e) {
            if (config.loud) console.log(e);
            return {
                status: false,
                error: "Unknown error."
             }
        }

        // If the status is ok, the user is in the database.
        if (data.status === "ok") {
            // Cache the data for future use.
            DiscordServer.DataCache[this.id] = data;

            try {

                // Check if these settings are enabled for this specific server,
                // if so, then put the member in the correct state.

                if (this.discordServer.getSetting('nicknameUsers')) {
                    await this.member.setNickname(this.getNickname(data));
                }

                if (this.discordServer.getSetting('verifiedRole')) {
                    await this.member.addRole(this.discordServer.getSetting('verifiedRole'));
                }
                
                if (this.discordServer.getSetting('verifiedRemovedRole')){
                    await this.member.removeRole(this.discordServer.getSetting('verifiedRemovedRole'));
                }

                if (this.discordServer.getSetting('announceChannel') && options.announce !== false) {
                    let channel = await this.server.channels.get(this.discordServer.getSetting('announceChannel'));

                    if (channel) {
                        channel.send(`**User verified:** <@${this.id}> as ${data.robloxUsername}`);
                    }
                }

                // Check if we want to resolve group rank bindings with cached or fresh data.
                if (options.clearBindingsCache !== false) {
                    DiscordServer.BindingsCache[data.robloxId] = {};
                }

                // Resolve group rank bindings for this member.
                if (this.discordServer.getSetting('groupRankBindings').length > 0) {
                    for (let binding of this.discordServer.getSetting('groupRankBindings')) {
                        // We use a Promise.then here so that they all execute asynchronously. 
                        DiscordServer.resolveGroupRankBinding(binding, data.robloxId)
                            .then((state) => {
                                if (state === true) {
                                    this.member.addRole(binding.role);
                                } else {
                                    this.member.removeRole(binding.role);
                                }
                            })
                            .catch((e) => {
                                if (config.loud) console.log(e);
                                console.log('Resolution error for binding');
                            });
                    }
                }
            } catch (e) {
                if (config.loud) console.log(e);
                // If anything failed here, it's most likely because the bot
                // couldn't modify the member due to a permission problem.
                return {
                    status: false,
                    nonFatal: true,
                    error: "RoVer couldn't modify the member in this server. Either the bot doesn't have permission or the target user cannot be modified by the bot (such as higher rank in the server)."
                }
            }

            return {
                status: true,
                robloxUsername: data.robloxUsername,
                robloxId: data.robloxId,
                discordId: this.member.id,
                discordName: this.member.user.username
            }
        } else {
            // Status was not "ok".
             switch (data.errorCode){
                case 404:
                    // User isn't in the database.

                    // Add the "Not Verified" role to the user.
                    if (this.discordServer.getSetting('verifiedRemovedRole')){
                        await this.member.addRole(this.discordServer.getSetting('verifiedRemovedRole'));
                    }

                    return {
                        status: false,
                        error: "Not verified. Go to https://verify.eryn.io to verify."
                    }
                case 429: 
                    // This client has exceeded the amount of requests allowed in a 60 second period.
                    return {
                        status: false,
                        error: "Server is busy. Please try again later."
                    }
                default:
                    // Something else is wrong.
                    return {
                        status: false,
                        error: "Unknown error."
                    }
            }
        }
    }
}