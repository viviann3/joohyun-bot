const { cards } = require('../../util/db.json')
const cardModel = require('../../models/CardBase.js')
const issueBase = require('../../models/IssueBase.js')
const userBase = require('../../models/Joohyun.js')
const { MessageEmbed } = require('discord.js')
const chance = require(`chance`)
const rdm = new chance();
//yez yez

module.exports = {
  name: 'gacha',
  aliases: ['g', 'ga', 'drop'],
  description: 'force a card into your inv',
  category: 'gacha',
  cooldown: '5m',
  callback: async ({ message, channel, args, Discord }) => {
    try {
      const user = await userBase.findOne({ userID: message.author.id })
      const card = rdm.pickone(cards)
      const cardcode = rdm.string({ pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890', length: 5 })

      const card1 = await issueBase.findOne({ name: card.name })
      let issue = 0;
      if (!card1) {
        let issue = 1
        const newIssue = issueBase.create({
          name: card.name,
          issue: issue
        })


      } else if (card1) {
        issue = await card1.issue
      }
      await issueBase.updateOne({ name: card.name }, { issue: issue + 1 })
      const color = '0xfcfcfc';
      const embed = new MessageEmbed()
        .setAuthor({ name: `Gacha — ${message.author.tag}`, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
        .setColor(color)
        .setDescription(`\`\`\`${cardcode}\`\`\`\n**Information**\nName: ${card.name} \`${card.rarity}\`\nGroup: ${card.group}\nIssue: ${issue}`)
        .setImage(card.image)
        .setFooter(`Thanks for playing Joohyun!`)
        .setTimestamp()




      const newCard = await cardModel.create({
        code: cardcode,
        name: card.name,
        image: card.image,
        group: card.group,
        rarity: card.rarity,
        issue: issue,
        owner: message.author.id,
        info: `${cardcode}#${issue} \`${card.rarity}\` **${card.name}** (${card.group})`
      })

      await message.reply({ embeds: [embed] })

    } catch (err) {
      console.log(err)
      message.reply(`new error lol: ${err}`)
    }
  }
}

