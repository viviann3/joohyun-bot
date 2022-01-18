const { Schema } = require('mongoose')
const mongoose = require('mongoose')

const reqString = {
  required: true,
  type: String
}

const cardSchema = new mongoose.Schema({
  code: reqString,
  name: reqString,
  image: reqString,
  rarity: reqString,
  group: reqString,
  issue: Number,
  info: reqString,
  owner: reqString
})

module.exports = mongoose.model('cardBase', cardSchema)