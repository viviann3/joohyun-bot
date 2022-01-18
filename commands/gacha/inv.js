const Discord = require('discord.js');
const card = require('../../models/CardBase.js')
const ci = require('case-insensitive')


module.exports = {
name: "inv",
aliases: ["inventory", "cards", "c"],
description: "view ur cards",
category: "gacha",
callback: async ({message, channel, args, interaction, client}) => {

let mention = message.mentions?.users?.first()?.id
 || message.guild?.members?.cache?.get(args[0])?.id || args[0] ||message.author.id

let allcards = await card.find({ owner: message.author.id },
    null).sort({date: -1}).exec();



// if (args[1] === "name" || "n" || "g" || "group" || "issue" || "i") {
 
//     allcards = allcards.filter(function(cardings) {
//          let filtered = cardings.name
// if (args[1] === "name") {
//     filtered = cardings.name
// } else if (args[1] === "group") {
//     filtered = cardings.gc
// } else if (args[1] === "issue") {
//     filtered = cardings.issue
// } else if (args[1] === "rank") {
//     filtered = cardings.rarity
// }

//       return filtered === args[2]

//         })
//   console.log(allcards)

// } 
// if (args[3]) {
// if (args[3] === "name" || "n" || "g" || "group" || "issue" || "i") {
 

//     allcards = allcards.filter(function(cardings) {
//          let filtered = cardings.name
// if (args[3] === "name") {
//     filtered = cardings.name
// } else if (args[3] === "group") {
//     filtered = cardings.gc
// } else if (args[3] === "issue") {
//     filtered = cardings.issue
// } else if (args[3] === "rank") {
//     filtered = cardings.rarity
// }

//       return filtered === args[4] || args[4, 5] 
//         })
//   console.log(allcards)

// }
// }




let cards1 = allcards

console.log(cards1)

    if (!cards1) {

    } else {
  var cardcount = allcards.length
  console.log(cardcount)
if (cardcount === 0) {
      const embed = new Discord.MessageEmbed()
      .setAuthor(`Empty Inventory`)
       .setDescription(`Huh.. Seems like theres nothing to store here.`)
.setColor("#fcfcfc")
              .setFooter("Page 1 / 1 | Cards: 0")

    message.channel.send({
        embeds: [embed]
    })
}
else {
let currentPage = 0;
const embedding = generateembed(cards1, 10, mention);
console.log(embedding)
if (cardcount <= 10) {
    const inventory = await message.channel.send({
    embeds: [embedding[currentPage].setFooter(`Page ${currentPage + 1} / ${embedding.length} | Cards: ${allcards.length}`)]
    })
    } else {
const inventory = await message.channel.send({
    embeds: [embedding[currentPage].setFooter(`Page ${currentPage + 1} / ${embedding.length} | Cards: ${allcards.length}`)]
    })
await inventory.react("⏪")
await inventory.react("⬅️")
await inventory.react("➡️")
await inventory.react("⏩")


const reactid = message.author.id
const filter = (reaction, user) => ['⬅️', '➡️', '⏪', '⏩'].includes(reaction.emoji.name) && (user.id === reactid);
const collector = inventory.createReactionCollector({ filter })

collector.on('collect', (reaction, user) => {
    if (reaction.emoji.name === '➡️') {
        if (currentPage < embedding.length-1) {
            currentPage++
            inventory.edit({
                embeds: [embedding[currentPage].setFooter(`Page ${currentPage + 1} / ${embedding.length} | Cards: ${allcards.length}`)]
            })
        }
        reaction.users.remove(reactid)


    } else if (reaction.emoji.name === '⬅️') {
    if (currentPage !== 0) {
        --currentPage;
 inventory.edit({
                embeds: [embedding[currentPage].setFooter(`Page ${currentPage + 1} / ${embedding.length} | Cards: ${allcards.length}`)]
            })


    }
    reaction.users.remove(reactid)
    
    }
    else if (reaction.emoji.name === '⏩') {
        if (currentPage < embedding.length-1) {
        currentPage = embedding.length - 1;
 inventory.edit({
                embeds: [embedding[currentPage].setFooter(`Page ${currentPage + 1} / ${embedding.length} | Cards: ${allcards.length}`)]
            })


    }
    reaction.users.remove(reactid)
    
    }
     else if (reaction.emoji.name === '⏪') {
    if (currentPage !== 0) {
        currentPage = 0;
 inventory.edit({
                embeds: [embedding[currentPage].setFooter(`Page ${currentPage + 1} / ${embedding.length} | Cards: ${allcards.length}`)]
            })


    }
    reaction.users.remove(reactid)
    
     }
    })
}
}
}
}
}


function generateembed (mainembed, max, mentioned) {
      var k = max
     const embeds = []
     for (var i = 0 ; i < mainembed.length ; i+= max) {
       const sliced = mainembed.slice(i , k)
       console.log (sliced)
       var j = i
       k += max
       const info = sliced.map(cards1 => `${cards1.code}#${cards1.issue} \`${cards1.rarity}\` **${cards1.name}** (${cards1.group})`).join("\n")
       console.log(info)


       const embed = new Discord.MessageEmbed()
       .setAuthor(`Inventory`)
       .setDescription(`Here are the cards that match the filter(s)\n\n${info}`)
.setColor("#fcfcfc")

       embeds.push(embed) 
       
       }
       return embeds;
  }
