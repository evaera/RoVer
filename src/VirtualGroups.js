const path        = require('path')
const fs          = require('fs')
const Discord     = require('discord.js')
const request     = require('request-promise')
const config      = require('./data/client.json')

// VirtualGroups can be used in place of group IDs for
// group bindings. They are defined as keys in the
// VirtualGroups object. It must be a function that
// returns true or false. 
module.exports = {
    // Check if the given user is in the Roblox Dev Forum.
    // userid: ROBLOX user id.
    async DevForum(user) {
        let userid = user.id;
        // Resolve the Roblox username from the user id.
        let userData = {}
        try {
            userData = await request({
                uri: `http://api.roblox.com/users/${userid}`,
                json: true,
                simple: false
            });
        } catch (e) {
            return false;
        }

        let username = userData.Username;

        if (!username) return false;

        // Fetch the DevForum data for this user.
        let devForumData = {}
        
        try {
            devForumData = await request({
                uri: `http://devforum.roblox.com/users/${username}.json`,
                json: true,
                simple: false
            });
        } catch (e) {
            return false;
        }
        
        try {
            // If the trust_level in the user data is above 0, then they are a member.
            if (devForumData.user.trust_level > 0) {
                return true;
            }
        } catch(e) {
            return false;
        }

        return false;
    },

    async HasAsset(user, assetid) {
        let userid = user.id;
        try {
            let responseData = await request({
                uri: `http://api.roblox.com/ownership/hasasset?userId=${userid}&assetId=${assetid}`,
                simple: false
            });

            if (responseData === 'true') {
                return true;
            }
        } catch (e) {
            // do nothing
        }

        return false;
    },

    async BuildersClub(user, bcType) {
        let bc = await Cache.get(`bindings.${user.id}`, 'bc');
        // TODO: Fix the caching on this. Currently, as all bindings execute at the same time,
        // this won't actually ever cache because they are all requesting. 
        if (!bc) {
            let response = await request({
                uri: `https://www.roblox.com/Thumbs/BCOverlay.ashx?username=${user.username}`,
                simple: false,
                resolveWithFullResponse: true
            });

            let url = response.request.uri.href;
            bc = "NBC";

            if (url.includes("overlay_obcOnly")) {
                bc = "OBC";
            } else if (url.includes("overlay_tbcOnly")) {
                bc = "TBC";
            } else if (url.includes("overlay_bcOnly")) {
                bc = "BC";
            }

            Cache.set(`bindings.${user.id}`, 'bc', bc);
        }

        if (bcType && bcType === bc) {
            return true;
        } else if (!bcType && bc !== "NBC") {
            return true;
        }

        return false;
    },

    async BC(user) {
        return await module.exports.BuildersClub(user, "BC");
    },

    async TBC(user) {
        return await module.exports.BuildersClub(user, "TBC");
    },

    async OBC(user) {
        return await module.exports.BuildersClub(user, "OBC");
    },

    async NBC(user) {
        return await module.exports.BuildersClub(user, "NBC");
    },
}