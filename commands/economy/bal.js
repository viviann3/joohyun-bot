const CurrencySystem = require('currency-system')
const cs = new CurrencySystem;
const { MessageEmbed } = require('discord.js')

module.exports = {
  name: 'balance',
  aliases: ['bal', 'wallet'],
  description: 'check if ur rich',
  category: 'economy',
  callback: async ({ message, channel, args }) => {
    try {
      let result = await cs.balance({
        user: message.author.id
      })

      const color = '0xfcfcfc';
      const embed = new MessageEmbed()
        .setAuthor({ name: `Balance — ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setDescription(`<@${message.author.id}> Owns ${(result.wallet).toLocaleString()} <:joohhearts:932267596449996832> in their account!`)
        .setColor(color)
        .setFooter(`Tip: work to earn more joohhearts!`)

      message.channel.send({
        embeds: [embed]
      })
    } catch (err) {
      console.log(err)
      message.reply(`${err}`)
    }
  }
}