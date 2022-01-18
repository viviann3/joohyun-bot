const { Schema } = require('mongoose')
const mongoose = require('mongoose')

const reqString = {
  required: true,
  type: String
}

const profileSchema = new mongoose.Schema({
  userID: reqString,
  balance: Number,
  bio: { type: String, default: 'This is my bio!' },
  favcard: { type: String, default: 'None' }
})

module.exports = mongoose.model('profile', profileSchema)