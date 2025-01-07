require('dotenv').config();

const fs = require('fs');
const Discord = require('discord.js');
const Client = require('./client/Client');
const config = require('./config.json');
const { Player } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const {
    SpotifyExtractor,
    AppleMusicExtractor,
    SoundCloudExtractor,
    AttachmentExtractor
} = require('@discord-player/extractor');
const { TTSExtractor } = require('tts-extractor');

const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));

const client = new Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}
console.log(client.commands);

const player = new Player(client, {
    ytdlOptions: {
        requestOptions: {
            headers: {
                cookie: cookies
            }
        }
    }
});

player.extractors.register(YoutubeiExtractor, {
    authentication: process.env.YOUTUBE_AUTH,
});
player.extractors.register(SoundCloudExtractor, {});
player.extractors.register(SpotifyExtractor, {});
player.extractors.register(AppleMusicExtractor, {});
player.extractors.register(AttachmentExtractor, {});
player.extractors.register(TTSExtractor, { language: 'en', slow: false }); // Register TTS extractor
console.log('All extractors registered, including TTS!');

player.events.on('audioTrackAdd', (queue, song) => {
    queue.metadata.channel.send(`🎶 | Song **${song.title}** added to the queue!`);
});
player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send(`▶ | Started playing: **${track.title}**!`);
});
player.events.on('audioTracksAdd', (queue) => {
    queue.metadata.channel.send('🎶 | Tracks have been queued!');
});
player.events.on('disconnect', queue => {
    queue.metadata.channel.send('❌ | I was manually disconnected from the voice channel, clearing queue!');
});
player.events.on('emptyChannel', queue => {
    queue.metadata.channel.send('❌ | Nobody is in the voice channel, leaving...');
});
player.events.on('emptyQueue', queue => {
    queue.metadata.channel.send('✅ | Queue finished!');
});
player.events.on('error', (queue, error) => {
    console.error(`[${queue.guild.name}] Error emitted from the connection: ${error.message}`);
});
player.events.on('playerError', (queue, error) => {
    console.error(`Player error: ${error.message}`);
});
player.events.on('debug', (queue, message) => {
    console.log(`Player debug: ${message}`);
});

client.on('ready', () => {
    console.log('Bot is ready!');
    if (client.user) {
        client.user.presence.set({ status: 'online' });
    }
});

client.once('reconnecting', () => {
    console.log('Reconnecting!');
});
client.once('disconnect', () => {
    console.log('Disconnect!');
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;
    if (!client.application?.owner) await client.application?.fetch();

    if (message.content === '!deploy' && (
        message.author.id === client.application?.owner?.id ||
        message.author.id === '269249777185718274' ||
        message.author.id === '755827989073231932'
    )) {
        console.log(`Deploy command received from user: ${message.author.id}`);
        try {
            await message.guild.commands.set(client.commands.map(cmd => cmd));
            console.log("Deployed slash commands.");
            message.reply('✅ | Commands deployed!');
        } catch (err) {
            console.error(`Failed to deploy commands: ${err}`);
            message.reply('❌ | Failed to deploy commands! Ensure the bot has the `application.commands` permission.');
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName.toLowerCase());

    try {
        if (['ban', 'userinfo'].includes(interaction.commandName)) {
            command.execute(interaction, client);
        } else {
            command.execute(interaction);
        }
    } catch (error) {
        console.error(error);
        await interaction.followUp({ content: '❌ | An error occurred while executing the command!' });
    }
});

const ttsStates = new Map();

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const guildId = message.guild.id;
    const userId = message.author.id;
    if (ttsStates.has(guildId) && ttsStates.get(guildId).get(userId)) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply('❌ | You need to be in a voice channel to use TTS.');
        }

        try {
            await player.play(voiceChannel.id, `tts:${message.content}`, {
                nodeOptions: {
                    metadata: {
                        channel: message.channel,
                        client: message.guild?.members.me,
                        requestedBy: message.author.username,
                    },
                    leaveOnEmptyCooldown: 300000,
                    leaveOnEmpty: true,
                    leaveOnEnd: false,
                    bufferingTimeout: 0,
                },
            });
        } catch (error) {
            console.error('Error playing TTS:', error);
        }
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    const guildId = oldState.guild.id;
    const userId = oldState.id;

    if (!newState.channel && ttsStates.has(guildId)) {
        const guildTTSStates = ttsStates.get(guildId);
        guildTTSStates.delete(userId);

        if (guildTTSStates.size === 0) {
            ttsStates.delete(guildId);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
