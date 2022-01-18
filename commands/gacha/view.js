const cardBase = require('../../models/CardBase.js')
const { MessageEmbed } = require('discord.js')

module.exports = {
  name: 'view',
  aliases: ['v', 'vw'],
  description: 'when youre too broke to have the card',
  category: 'gacha',
  callback: async ({message, channel, Discord}) => {
      try {
      const args = message.content.split(" ")
      const arg = args[1];

      if (!arg) {
        message.reply("Please enter a card code to view.")
      } else {
        console.log(arg)
      }

      const card = await cardBase.findOne({ code: arg })
      let color = '0xfcfcfc';
      const embed = new MessageEmbed()
       .setAuthor({name: `Viewing — ${message.author.tag}`, iconURL: message.member.displayAvatarURL({dynamic: true})})
       .setDescription(`Currently viewing: **${arg}** (${card.name} \`${card.rarity}\`)`)
       .setImage(card.image)
       .setColor(color)
       .setFooter(`Tip: use >gacha to get more cards!`);
      
      message.channel.send({
        embeds: [embed]
      })
   } catch (err) {
        console.log(err)
        message.reply(`${arg} is not a valid card code.`)
   }
  }
}