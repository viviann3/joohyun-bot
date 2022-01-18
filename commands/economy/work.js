const CurrencySystem = require('currency-system')
const cs = new CurrencySystem;
const { MessageEmbed } = require('discord.js')
const chance = require('chance');

module.exports = {
  name: 'work',
  description: 'GET MONEY',
  category: 'economy',
  cooldown: '1h',
  callback: async ({message, channel, args}) => {
    try {
      const rdm = new chance()
      const workamt = rdm.integer({ min: 20, max: 200 })
      
      let color = '0xfcfcfc';
      const embed = new MessageEmbed() 
      .setAuthor({name: `Work — ${message.author.tag}`, iconURL: message.author.displayAvatarURL({dynamic: true})})
      .setDescription(`<@${message.author.id}> Worked hard and earned ${workamt} <:joohhearts:932267596449996832>!`)
      .setColor(color)
      .setFooter(`Tip: You can work again in an hour`)

      let result = await cs.addMoney({
        user: message.author.id,
        amount: workamt,
        whereToPutMoney: 'wallet'
      })

      message.channel.send({
        embeds: [embed]
      })
    } catch (err) {
      console.log(err)
      message.reply(`${err}`)
    }
  }
}