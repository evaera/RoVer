const Command = require('../Command');

module.exports =
   class PingCommand extends Command {
      constructor(client) {
         super(client, {
            name: 'ping',
            properName: 'Ping',
            description: 'Ping the bot to see API latency',
            userPermissions: []
         })
      }
      async fn(msg) {
         const m = msg.channel.send('Pinging...');
         await m.edit(`:ping_pong: Pong! Took **${message.createdTimestamp - msg.createdTimestamp}ms**`);
      }
   }
