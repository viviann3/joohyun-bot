const CurrencySystem = require('currency-system')
const cs = new CurrencySystem;
const { MessageEmbed } = require('discord.js')

module.exports = {
  name: 'give',
  description: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  category: 'economy',
  callback: async ({message, channel, args}) => {
    try {
      let user;
      if (message.mentions.users.first()) {
        user = message.mentions.users.first()
      } else if (args[0]) {
        user = await message.guild.members.fetch(args[0])
        if (user) user = user.user;
      }

      if (user.id === message.author.id) {
        message.reply(`no thats wrong`)
      }
      
      message.channel.send({
        embeds: [embed]
      })
    } catch (err) {
      console.log(err)
      message.reply(`${err}`)
    }
  }
}