const Command = require('../Command')
const DiscordServer = require('../../DiscordServer')
const { Role } = require('discord.js')
const config = require('../../data/client.json')

async function recursiveUpdate (memberArray, server, msg, errors) {
  const nextMember = memberArray.pop()
  if (!nextMember) {
    let errorText = ''
    if (errors.length > 0) {
      errorText = `\nThere was an error while updating the following members: \`\`\`${errors.join('\n')}\`\`\``
    }
    return msg.reply(`:white_check_mark: Finished bulk update! ${server.bulkUpdateCount} members affected.${errorText}`, { split: true }).then(() => {
      server.bulkUpdateCount = 0
      server.ongoingBulkUpdate = false
    })
  }

  if (!nextMember.user.bot) {
    const member = await server.getMember(nextMember.id)
    if (member) {
      try {
        await member.verify({ skipWelcomeMessage: true })
      } catch (e) {
        errors.push(`${member.member.displayName}#${member.user.discriminator}`)
      }

      server.bulkUpdateCount++
    }
  }
  return recursiveUpdate(memberArray, server, msg, errors)
}

async function returnMembersOfRole(role) {
  return new Promise(resolve => {
    role.guild.members.fetch().then(collection => {
      let rolledMembers = collection.filter(member => member.roles.cache.has(role.id));
      resolve(rolledMembers.array());
    });
  });
}

module.exports =
class UpdateCommand extends Command {
  constructor (client) {
    super(client, {
      name: 'update',
      properName: 'Update',
      aliases: ['roverupdate'],
      description: '`<Discord User>` Forcibly update verification status of a user, same as them running !verify. Make sure you @mention the user.',
      throttling: { usages: 1, duration: 10 }, // 1 usage every 10 seconds

      args: [
        {
          key: 'user',
          prompt: 'User to update',
          type: 'user|role'
        }
      ]
    })
  }

  hasPermission (msg) {
    return this.client.isOwner(msg.author) || msg.member.hasPermission(this.userPermissions) || msg.member.roles.cache.find(role => role.name === 'RoVer Admin') || msg.member.roles.cache.find(role => role.name === 'RoVer Updater')
  }

  async fn (msg, args) {
    const target = args.user
    DiscordServer.clearMemberCache(target.id)

    const server = await this.discordBot.getServer(msg.guild.id)
    if (!(target instanceof Role)) { // They want to update a specific user (roles have .hoist, users do not)
      const member = await server.getMember(target.id)
      if (!member) {
        return msg.reply('User not in guild.')
      }

      member.verify({ message: msg, skipWelcomeMessage: true })
    } else if (!this.discordBot.isPremium()) {
      return msg.reply('Sorry, updating more than one user is only available with RoVer Plus: <https://www.patreon.com/erynlynn>.')
    } else { // They want to update a whole role (premium feature)
      const roleMembers = await returnMembersOfRole(target)
      const affectedCount = roleMembers.length // # of affected users
      const server = await this.discordBot.getServer(msg.guild.id)

      if (server.ongoingBulkUpdate) {
        return msg.reply('There is already an ongoing bulk update in this server.')
      }

      const limit = config.massUpdateLimit || 0
      if (affectedCount > limit) {
        return msg.reply(`Sorry, but RoVer only supports updating up to ${limit} members at once. Updating this role would affect approximately ${affectedCount} members.`)
      }

      server.ongoingBulkUpdate = true
      msg.reply(`:hourglass_flowing_sand: Updating ${affectedCount} members. We'll let you know when we're done.`)

      recursiveUpdate(roleMembers, server, msg, [])
    }
  }
}
