const DiscordJS = require('discord.js')
const WOKCommands = require('wokcommands')
const path = require('path')
const mongoose = require('mongoose')
const server = require('./server.js')

const CurrencySystem = require("currency-system");
const cs = new CurrencySystem;
// Method:
cs.setMongoURL(process.env.MONGO);


const { Intents } = DiscordJS
const client = new DiscordJS.Client({
  // These intents are recommended for the built in help menu
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
  ],
})




client.on('ready', () => {
  const dbOptions = {
    // These are the default values
    keepAlive: true
  }

  new WOKCommands(client, {
    // The name of the local folder for your command files
    commandsDir: path.join(__dirname, 'commands'),
    dbOptions,
    mongoUri: process.env.MONGO
  })
  .setDefaultPrefix('>')
})
client.on("error", (err) =>{
    console.log(err)
})
process.on('unhandledRejection', error => {
    console.log('Test error:', error);
});
client.on("debug", ( e ) => console.log(e)); 
client.login(process.env['TOKEN'])

const setStatus = (client, status) => {
  client.user.setPresence({
    status: 'idle',
    activity: {
      name: "your cards",
      type: "WATCHING"
    }
  })
}
//im ttring to redo drp
client.login(process.env.TOKEN)