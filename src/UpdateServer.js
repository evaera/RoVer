const express       = require('express')
const DiscordServer = require('./DiscordServer')

module.exports = 

function(discordBot, config) {
    let server = express();

    server.get('/update-user', (req, res) => {
        if (config.apiKey && config.apiKey !== req.query.apiKey) {
            res.status(403).end();
        }

        if (req.query.id == null) {
            res.status(400).end();
        }

        let id = req.query.id;

        res.end('ok');

        discordBot.globallyUpdateMember(id);
    })

    server.listen(config.port, () => {
        console.log(`Update server listening on ${config.port}`);
    });
}