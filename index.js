require('dotenv').config();

const fs = require('fs');
const Discord = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { Player } = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');
const {
    SpotifyExtractor,
    AppleMusicExtractor,
    SoundCloudExtractor,
    AttachmentExtractor,
} = require('@discord-player/extractor');
const { TTSExtractor } = require('tts-extractor');

const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));

const client = new Discord.Client({ intents: ['GUILD_MESSAGES', 'GUILD_VOICE_STATES'] });
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
                cookie: cookies,
            },
        },
    },
});

try {
    player.extractors.register(YoutubeiExtractor, { authentication: process.env.YOUTUBE_AUTH });
    console.log('✔ YouTubei extractor registered successfully!');
} catch (error) {
    console.error('❌ Failed to register YouTubei extractor:', error);
}

player.extractors.register(SoundCloudExtractor, {});
player.extractors.register(SpotifyExtractor, {});
player.extractors.register(AppleMusicExtractor, {});
player.extractors.register(AttachmentExtractor, {});
player.extractors.register(TTSExtractor, { language: 'en', slow: false });

player.events.on('audioTrackAdd', (queue, song) => {
    queue.metadata.channel.send(`🎶 | Song **${song.title}** added to the queue!`);
});
player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send(`▶ | Started playing: **${track.title}**!`);
});
player.events.on('error', (queue, error) => {
    console.error(`[${queue.guild.name}] Error: ${error.message}`);
});

client.on('ready', () => {
    console.log('Bot is ready!');
    client.user.setPresence({ status: 'online', activities: [{ name: 'Music & Commands' }] });
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (!client.application?.owner) await client.application?.fetch();

    if (message.content === '!deploy' && (
        message.author.id === client.application?.owner?.id ||
        message.author.id === '269249777185718274' ||
        message.author.id === '755827989073231932'
    )) {
        console.log(`Deploy command received from user: ${message.author.id} in guild: ${message.guild.id}`);

        const commands = [];
        client.commands.forEach((cmd) => {
            commands.push(cmd);
        });

        commands.push({
            name: 'echo',
            description: 'Toggle TTS for your messages in the voice channel.',
            options: [
                {
                    name: 'state',
                    type: Discord.ApplicationCommandOptionType.String,
                    description: 'Set echo state to "on" or "off"',
                    required: true,
                    choices: [
                        { name: 'on', value: 'on' },
                        { name: 'off', value: 'off' },
                    ],
                },
            ],
        });

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

        try {
            console.log('🔄 | Refreshing application (/) commands...');
            await rest.put(
                Routes.applicationGuildCommands(client.application.id, message.guild.id), // Dynamic guild ID
                { body: commands }
            );
            console.log(`✅ | Successfully reloaded application (/) commands for guild: ${message.guild.id}`);
            message.reply('✅ | Commands deployed successfully!');
        } catch (error) {
            console.error('❌ | Failed to deploy commands:', error);
            message.reply('❌ | Failed to deploy commands! Check the logs for details.');
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName.toLowerCase());
    if (!command) {
        return;
    }

    try {
        await interaction.deferReply({ ephemeral: false });

        await command.execute(interaction, client);

        if (!interaction.replied && !interaction.deferred) {
            await interaction.followUp({ content: '✅ | Command executed successfully!' });
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
