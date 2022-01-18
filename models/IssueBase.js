const { Schema } = require('mongoose')
const mongoose = require('mongoose')

const reqString = {
  required: true,
  type: String
}

const issueSchema = new mongoose.Schema({
  name: reqString,
  issue: Number
}) 

module.exports = mongoose.model('issueBase', issueSchema)