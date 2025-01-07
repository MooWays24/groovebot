require('dotenv').config();

const fs = require('fs');
const Discord = require('discord.js');
const Client = require('./client/Client');
const config = require('./config.json');
const {Player} = require('discord-player');
const { YoutubeiExtractor } = require('discord-player-youtubei');

const {
    SpotifyExtractor,
    AppleMusicExtractor,
    SoundCloudExtractor,
    AttachmentExtractor
} = require('@discord-player/extractor');

const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));

const client = new Client();
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

console.log(client.commands);

const oauthTokens = {
    accessToken: process.env.YOUTUBE_ACCESS_TOKEN,
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
    scope: process.env.YOUTUBE_SCOPE,
    tokenType: process.env.YOUTUBE_TOKEN_TYPE,
    expiryDate: new Date(process.env.YOUTUBE_EXPIRY_DATE).getTime()
};

const player = new Player(client, {
    ytdlOptions: {
        requestOptions: {
            headers: {
                cookie: cookies
            }
        }
    }
});

// Register the Youtube extractor
player.extractors.register(YoutubeiExtractor, {
       authentication: process.env.YOUTUBE_AUTH,
});
console.log('YouTubeI extractor registered with cookies!');

// Register the Soundcloud extractor
player.extractors.register(SoundCloudExtractor);
console.log('SoundCloud extractor registered!');

// Register the Spotify extractor
player.extractors.register(SpotifyExtractor);
console.log('Spotify extractor registered!');

// Register the Apple Music extractor
player.extractors.register(AppleMusicExtractor);
console.log('Apple Music extractor registered!');

// Register the AttachmentExtractor
player.extractors.register(AttachmentExtractor);
console.log('Attachment extractor registered!');

player.events.on('audioTrackAdd', (queue, song) => {
    queue.metadata.channel.send(`🎶 | Song **${song.title}** added to the queue!`);
});

player.events.on('playerStart', (queue, track) => {
    queue.metadata.channel.send(`▶ | Started playing: **${track.title}**!`);
});

player.events.on('audioTracksAdd', (queue, track) => {
    queue.metadata.channel.send(`🎶 | Tracks have been queued!`);
});

player.events.on('disconnect', queue => {
    queue.metadata.channel.send('❌ | I was manually disconnected from the voice channel, clearing queue!');
});

player.events.on('emptyChannel', queue => {
    queue.metadata.channel.send('❌ | Nobody is in the voice channel, leaving...');
});

player.events.on('emptyQueue', queue => {
    queue.metadata.channel.send('✅ | Queue finished!');
    // Delete queue and disconnect from voice channel
    queue.delete();
});

player.events.on('error', (queue, error) => {
    console.log(`[${queue.guild.name}] Error emitted from the connection: ${error.message}`);
});

// For debugging
player.on('debug', async (message) => {
    console.log(`General player debug event: ${message}`);
});

player.events.on('debug', async (queue, message) => {
    console.log(`Player debug event: ${message}`);
});

player.events.on('playerError', (queue, error) => {
    console.log(`Player error event: ${error.message}`);
    console.log(error);
});

client.on('ready', function () {
    console.log('Ready!');
    client.user.presence.set({
        activities: [{name: config.activity, type: Number(config.activityType)}],
        status: Discord.Status.Ready,
    });
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

    if (message.content === '!deploy' && (message.author.id === client.application?.owner?.id || `${message.author.id}` === '269249777185718274' || `${message.author.id}` === '755827989073231932')) {
        console.log(`Got command deployment signal from user: ${message.author.id}`);
        await message.guild.commands
            .set(client.commands)
            .then(() => {
                console.log("Deployed slash commannds.");
                message.reply('Deployed!');
            })
            .catch(err => {
                message.reply('Could not deploy commands! Make sure the bot has the application.commands permission!');
                console.error(`Failed to deploy commands: ${err}`);
            });
    }
});

client.on('interactionCreate', async interaction => {
    const command = client.commands.get(interaction.commandName.toLowerCase());

    try {
        if (interaction.commandName == 'ban' || interaction.commandName == 'userinfo') {
            command.execute(interaction, client);
        } else {
            command.execute(interaction);
        }
    } catch (error) {
        console.error(error);
        await interaction.followUp({
            content: 'There was an error trying to execute that command!',
        });
    }
});

client.login(process.env.DISCORD_TOKEN);
