import * as mongoose from "mongoose";
const Schema = mongoose.Schema;

// define the schema for our user model
const lockSchema = new Schema({
  createdAt: {
    type: Date,
    default: Date.now
  },
  refreshedAt: {
    type: Date,
    default: Date.now,
    // Locks are not supposed to last longer than a minute
    expires: 60
  },
  action: {
    type: String,
    unique: true,
    required: true
  }
});

export default lockSchema;
