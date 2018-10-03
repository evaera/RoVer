/* global Cache */

const request = require('request-promise')

// VirtualGroups can be used in place of group IDs for
// group bindings. They are defined as keys in the
// VirtualGroups object. It must be a function that
// returns true or false.

/**
 * Check if the given user is in the Roblox Dev Forum.
 *
 * @param {object} user The user data
 * @returns {object} The DebForum profile data
 */
async function getDevForumProfile (user) {
  let username = user.username
  let userProfile = await Cache.get(`bindings.${user.id}`, 'DevForumProfile')

  if (!userProfile) {
    try {
      let devForumData = await request({
        uri: `https://devforum.roblox.com/users/${username}.json`,
        json: true,
        simple: false
      })

      userProfile = devForumData.user

      Cache.set(`bindings.${user.id}`, 'DevForumProfile', userProfile)
    } catch (e) {
      return false
    }
  }

  return userProfile
}

/**
 * @module VirtualGroups
 */
module.exports = {
  async DevForumTopContributor (user) {
    const userProfile = await getDevForumProfile(user)
    if (!userProfile) return

    return userProfile.groups.find(g => g.name === 'Top_Contributor') != null
  },

  async RobloxStaff (user) {
    const userProfile = await getDevForumProfile(user)
    if (!userProfile) return

    return userProfile.primary_group_name === 'Roblox_Staff'
  },

  /**
   * Check if the given user is in the Roblox Dev Forum.
   *
   * @param {object} user The user data
   * @param {int} trustLevel The trust level to check against
   * @returns {boolean} The resolution of the binding
   */
  async DevForumAccess (user, trustLevel) {
    const userProfile = await getDevForumProfile(user)
    if (!userProfile) return

    const userTrustLevel = userProfile.trust_level

    if (trustLevel == null && userTrustLevel > 0) {
      return true
    }

    if (!userTrustLevel || userTrustLevel !== trustLevel) {
      return false
    }

    return true
  },

  async DevForum (user) { // old, left for compatibility
    return module.exports.DevForumAccess(user, 2)
  },

  async DevForumBasic (user) { // old, left for compatibility
    return module.exports.DevForumAccess(user, 1)
  },

  async DevForumMember (user) {
    return module.exports.DevForumAccess(user, 2)
  },

  async DevForumNewMember (user) {
    return module.exports.DevForumAccess(user, 1)
  },

  /**
   * Returns if the user has the specified type of bc
   * @param {object} user The user data
   * @param {string} [bcType] The type of BC to check for, if omitted works for any bc
   * @returns {boolean} The binding resolution
   * @todo Fix the caching on this. Currently, as all bindings execute at the same time,
   * @todo this won't actually ever cache because they are all requesting. (only if more than one BC bound)
   */
  async BuildersClub (user, bcType) {
    let bc = await Cache.get(`bindings.${user.id}`, 'bc')
    if (!bc) {
      let response = await request({
        uri: `https://www.roblox.com/Thumbs/BCOverlay.ashx?username=${user.username}`,
        simple: false,
        resolveWithFullResponse: true
      })

      let url = response.request.uri.href
      bc = 'NBC'

      if (url.includes('overlay_obcOnly')) {
        bc = 'OBC'
      } else if (url.includes('overlay_tbcOnly')) {
        bc = 'TBC'
      } else if (url.includes('overlay_bcOnly')) {
        bc = 'BC'
      }

      Cache.set(`bindings.${user.id}`, 'bc', bc)
    }

    if (bcType && bcType === bc) {
      return true
    } else if (!bcType && bc !== 'NBC') {
      return true
    }

    return false
  },

  async BC (user) {
    return module.exports.BuildersClub(user, 'BC')
  },

  async TBC (user) {
    return module.exports.BuildersClub(user, 'TBC')
  },

  async OBC (user) {
    return module.exports.BuildersClub(user, 'OBC')
  },

  async NBC (user) {
    return module.exports.BuildersClub(user, 'NBC')
  },

  /**
   * Returns true if a given user is in a given group's clan
   * @param {object} user The user to check
   * @param {number} groupid The group id
   * @param {DiscordServer} DiscordServer DiscordServer static reference
   * @returns {boolean} True if user is in the clan
   */
  async Clan (user, groupid, DiscordServer) {
    const userGroups = await DiscordServer.getRobloxMemberGroups(user.id)

    for (let group of userGroups) {
      if (group.Id === groupid) {
        return group.IsInClan
      }
    }

    return false
  },

  /**
   * Returns true if a given user is an ally or enemy of a given group.
   * @param {object} user The user to check
   * @param {number} groupid The group id
   * @param {DiscordServer} DiscordServer DiscordServer static reference
   * @param {"allies" | "enemies"} [relation] The relationship type to check.
   * @returns {boolean} True if user meets relationship requirement.
   */
  async _Relationship (user, groupid, DiscordServer, relation = 'allies') {
    if (relation !== 'allies' && relation !== 'enemies') {
      throw new Error('Invalid relationship type!')
    }

    const userGroups = await DiscordServer.getRobloxMemberGroups(user.id)

    // Important to cache group relationships, as this is an expensive operation
    let allies = await Cache.get(`groups.${groupid}`, relation)
    if (allies == null) {
      allies = []
      // Roblox ally/enemy APIs are paginated, only get a max of 10 pages
      let page = 1
      while (page < 10) {
        const content = await request(`https://api.roblox.com/groups/${groupid}/${relation}?page=${page}`, {
          json: true
        })

        for (let group of content.Groups) {
          allies.push(group.Id)
        }

        if (content.FinalPage) {
          break
        } else {
          page++
        }
      }

      Cache.set(`groups.${groupid}`, relation, allies)
    }

    for (let group of userGroups) {
      if (allies.includes(group.Id)) {
        return true
      }
    }
  },

  async Ally (user, groupid, DiscordServer) {
    return module.exports._Relationship(user, groupid, DiscordServer, 'allies')
  },

  async Enemy (user, groupid, DiscordServer) {
    return module.exports._Relationship(user, groupid, DiscordServer, 'enemies')
  },

  /**
   * Returns true if a given user is friends with a given user.
   * @param {object} user The user to check
   * @param {number} friendid The friend id
   * @returns {boolean} True if user is friends with the given user.
   */
  async Friend (user, friendid) {
    try {
      let friends = await Cache.get(`bindings.${user.id}`, 'friends')
      if (!friends) {
        friends = (await request({
          uri: `https://friends.roblox.com/v1/users/${user.id}/friends`,
          simple: false,
          json: true
        })).data

        Cache.set(`bindings.${user.id}`, 'friends', friends)
      }

      return friends.find(user => user.id.toString() === friendid.toString()) != null
    } catch (e) {
      // Do nothing
    }

    return false
  },

  /**
   * Checks if a user owns a specific item on Roblox.
   * @param {object} user The user data.
   * @param {int} itemId The item id.
   * @param {DiscordServer} DiscordServer DiscordServer
   * @param {string} [itemType='Asset'] The item type.
   * @returns
   */
  async _Ownership (user, itemId, _, itemType = 'Asset') {
    try {
      let doesHaveAsset = await Cache.get(`bindings.${user.id}`, `${itemType}.${itemId}`)
      if (doesHaveAsset == null) {
        let responseData = await request({
          uri: `https://inventory.roblox.com/v1/users/${user.id}/items/${itemType}/${itemId}`,
          simple: false,
          json: true
        })

        doesHaveAsset = responseData.data.length > 0
        Cache.set(`bindings.${user.id}`, `${itemType}.${itemId}`, doesHaveAsset)
      }

      return doesHaveAsset
    } catch (e) {
      // Do nothing
    }

    return false
  },

  // HasAsset for backwards compatibility
  async HasAsset (user, itemId) {
    return module.exports._Ownership(user, itemId, undefined, 'Asset')
  },

  async Asset (user, itemId) {
    return module.exports._Ownership(user, itemId, undefined, 'Asset')
  },

  async GamePass (user, itemId) {
    return module.exports._Ownership(user, itemId, undefined, 'GamePass')
  },

  async Badge (user, itemId) {
    return module.exports._Ownership(user, itemId, undefined, 'Badge')
  }
}
