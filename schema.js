const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// define the schema for our user model
var lockSchema = new Schema({
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60
  },
  action: {
    type: String,
    unique: true,
    required: true
  }
});


module.exports = lockSchema;
