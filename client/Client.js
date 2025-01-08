const {Client, Collection, GatewayIntentBits, Partials} = require('discord.js');

module.exports = class extends Client {
    constructor(config = null) {
        super({
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates,GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
        });

        this.commands = new Collection();
        this.ttsStates = new Map();

        this.config = config;
    }
};
