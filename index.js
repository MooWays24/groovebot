require('dotenv').config();

const fs = require('fs');

const Discord = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { Player, useMainPlayer } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const {
    SpotifyExtractor,
    AppleMusicExtractor,
    SoundCloudExtractor,
    AttachmentExtractor,
} = require('@discord-player/extractor');
const { TTSExtractor } = require('tts-extractor');

const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));

const Client = require('./client/Client');

const client = new Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}
console.log(client.commands);

const ytdlOptions = {
    ytdlOptions: {
        requestOptions: {
            headers: {
                cookie: cookies,
            },
        },
    },
};
console.log(`Using yt-dlp options: ${JSON.stringify(ytdlOptions)}`);
const player = new Player(client, ytdlOptions);

try {
    player.extractors.register(YoutubeiExtractor, {
        authentication: process.env.YOUTUBE_AUTH,
    });
    console.log('✔ YouTubei extractor registered successfully!');
} catch (error) {
    console.error('❌ Failed to register YouTubei extractor:', error);
}

try {
    player.extractors.register(SoundCloudExtractor, {});
    console.log('✔ SoundCloud extractor registered successfully!');
} catch (error) {
    console.error('❌ Failed to register SoundCloud extractor:', error);
}

try {
    player.extractors.register(SpotifyExtractor, {});
    console.log('✔ Spotify extractor registered successfully!');
} catch (error) {
    console.error('❌ Failed to register Spotify extractor:', error);
}

try {
    player.extractors.register(AppleMusicExtractor, {});
    console.log('✔ Apple Music extractor registered successfully!');
} catch (error) {
    console.error('❌ Failed to register Apple Music extractor:', error);
}

try {
    player.extractors.register(AttachmentExtractor, {});
    console.log('✔ Attachment extractor registered successfully!');
} catch (error) {
    console.error('❌ Failed to register Attachment extractor:', error);
}

try {
    player.extractors.register(TTSExtractor, { language: 'en', slow: false });
    console.log('✔ TTS extractor registered successfully!');
} catch (error) {
    console.error('❌ Failed to register TTS extractor:', error);
}

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
        client.user.setPresence({ status: 'online', activities: [{ name: 'Music & Commands' }] });
    } else {
        console.error('client.user is null');
    }
});

async function deployCommands(message) {

    console.log(`Deploy command received from user: ${message.author.id} in guild: ${message.guild.id}`);

    const commands = [];
    client.commands.forEach((cmd) => {
        commands.push(cmd);
    });

    const discordToken = process.env.DISCORD_TOKEN;
    if (!discordToken) {
        console.error('❌ | DISCORD_TOKEN is not defined in the environment variables.');
        return;
    }
    const rest = new REST({ version: '10' }).setToken(discordToken);

    try {
        console.log('🔄 | Refreshing application (/) commands...');
        if (client?.application?.id && message?.guild?.id) {
            await rest.put(
                Routes.applicationGuildCommands(client?.application?.id, message.guild.id),
                { body: commands }
            );
            console.log(`✅ | Successfully reloaded application (/) commands for guild: ${message.guild.id}`);
            message.reply('✅ | Commands deployed successfully!');
        }
    }
    catch (error) {
        console.error('❌ | Failed to deploy commands:', error);
        message.reply('❌ | Failed to deploy commands! Check the logs for details.');
    }
    return;
}

async function handleTTS(message) {
    const player = useMainPlayer();
    const queue = player.nodes.get(message.guild.id);
    const member = message.member;
    if (!member) {
        return message.reply('❌ | Member not found.');
    }
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
        return message.reply('❌ | You need to be in a voice channel to use TTS.');
    }

    try {
        if (queue && queue.node.isPlaying()) {
            queue.node.pause();
            console.log('Music playback paused for TTS.');
        }

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

        player.events.once('playerFinish', async () => {
            if (queue && !queue.node.isPlaying()) {
                queue.node.resume();
                console.log('Music playback resumed after TTS.');
            }
        });
    } catch (error) {
        console.error('Error during TTS playback:', error);

        if (queue && !queue.node.isPlaying()) {
            queue.node.resume();
            console.log('Music playback resumed after TTS error.');
        }
    }
}

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (!client.application?.owner) await client.application?.fetch();

    if (message.content === '!deploy' && (
        message.author.id === client.application?.owner?.id ||
        message.author.id === '269249777185718274' ||
        message.author.id === '755827989073231932'
    )) {
        return await deployCommands(message);
    }
    const guildId = message.guild.id;
    const userId = message.author.id;

    if (client.ttsStates.has(guildId) && client.ttsStates.get(guildId).get(userId)) {
        return await handleTTS(message);
    };
});


client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName.toLowerCase());
    if (!command) {
        return;
    }
    try {
        if (['ban', 'userinfo', 'echo'].includes(interaction.commandName)) {
            command.execute(interaction, client);
        } else {
            command.execute(interaction);
        }
    } catch (error) {
        console.error('Command execution error:', error);

        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: '❌ | An error occurred while executing the command!' });
        } else {
            await interaction.reply({ content: '❌ | An error occurred while executing the command!', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
