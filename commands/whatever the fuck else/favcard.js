const cardBase = require('../../models/CardBase.js')
const userBase = require('../../models/Joohyun.js')
const { MessageEmbed } = require('discord.js')

module.exports = {
  name: 'favorite',
  aliases: ['fav'],
  description: 'when youre biased so you favorite someone',
  category: 'whatever the fuck else',
  callback: async ({ message, channel }) => {
    try {
      const favCard = await userBase.findOne({ favcard: message.author.id })
      //
      const args = message.content.split(" ")
      const arg = args[1];
      const card = await cardBase.findOne({ code: arg })

      let color = '0xfcfcfc';
      const embed = new MessageEmbed()
       .setAuthor({ name: `Favorite — ${message.author.tag}`, iconURL: message.author.displayAvatarURL({dynamic: true})})
       .setDescription(`**${arg}** (${card.name} \`${card.rarity}\`) is now set as your Favorite card.`)
       .setThumbnail(card.image)
       .setColor(color)

      const newFavCard = await userBase.create({
        userID: message.author.id,
        favcard: arg
      })
      newFavCard.save();

      await userBase.updateOne({ userID: message.author.id }, { favcard: arg })

      message.channel.send({
        embeds: [embed]
      })
    } catch (err) {
      console.log(err)
    }
  }
}