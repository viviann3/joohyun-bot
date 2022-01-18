const cardBase = require('../../models/CardBase.js')
const { MessageEmbed } = require('discord.js')

module.exports = {
  name: 'gift',
  description: 'DONATE HYEWON CARDS TO FEIYA RN GRRRRR',
  category: 'gacha',
  callback: async ({message, channel, args, Discord}) => {
    try {
      const card = await cardBase.findOne({ })
      const args = message.content.split(" ")
      const arg = arg[1]
      let color = '0xfcfcfc';
      //
      if (!arg) {
        message.reply("Please add a card to gift")
      } else {
        console.log(arg)
      }
    } catch (err) {
      console.log(err)
    }
  }
}