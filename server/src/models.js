import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const options = { timestamps: true };
const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, lowercase: true, trim: true, unique: true },
  passwordHash: { type: String, required: true }
}, options);
userSchema.set('toJSON', { transform: (_doc, ret) => { delete ret.passwordHash; delete ret.__v; return ret; } });

const timelineSchema = new Schema({
  title: { type: String, required: true },
  organization: { type: String, required: true },
  location: String, from: { type: Date, required: true }, to: Date,
  current: { type: Boolean, default: false }, description: String
}, { _id: true });
const profileSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  handle: { type: String, required: true, lowercase: true, unique: true },
  headline: { type: String, required: true }, location: String, bio: String,
  skills: [String], githubUsername: String,
  links: { website: String, github: String, linkedin: String, x: String },
  experience: [timelineSchema], education: [timelineSchema]
}, options);
const commentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true }, createdAt: { type: Date, default: Date.now }
});
const postSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true }, likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema]
}, options);
postSchema.index({ createdAt: -1 });

export const User = model('User', userSchema);
export const Profile = model('Profile', profileSchema);
export const Post = model('Post', postSchema);
