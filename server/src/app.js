import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import path from 'node:path';
import { User, Profile, Post } from './models.js';
import { registerSchema, loginSchema, profileSchema, timelineSchema, textSchema } from './validation.js';

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const httpError = (status, message) => Object.assign(new Error(message), { status });
const objectId = id => { if (!mongoose.isValidObjectId(id)) throw httpError(400, 'Invalid ID'); return id; };
const parse = (schema, body) => schema.parse(body);

export function createApp({ secret = process.env.JWT_SECRET, origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173', staticPath, trustProxy = false } = {}) {
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
  const app = express();
  app.set('trust proxy', trustProxy);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin }));
  app.use(express.json({ limit: '32kb' }));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: 'draft-7', legacyHeaders: false }));
  const sign = user => jwt.sign({ sub: String(user._id) }, secret, { expiresIn: '7d' });
  const auth = asyncRoute(async (req, _res, next) => {
    const token = /^Bearer (.+)$/i.exec(req.get('authorization') || '')?.[1];
    if (!token) throw httpError(401, 'Sign in required');
    let payload;
    try { payload = jwt.verify(token, secret); } catch { throw httpError(401, 'Session expired or invalid'); }
    const user = await User.findById(payload.sub);
    if (!user) throw httpError(401, 'Account no longer exists');
    req.user = user;
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.post('/api/auth/register', asyncRoute(async (req, res) => {
    const { name, email, password } = parse(registerSchema, req.body);
    if (await User.exists({ email: email.toLowerCase() })) throw httpError(409, 'Email already registered');
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ token: sign(user), user });
  }));
  app.post('/api/auth/login', asyncRoute(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw httpError(401, 'Invalid email or password');
    res.json({ token: sign(user), user });
  }));
  app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }));
  app.get('/api/profiles', asyncRoute(async (_req, res) => res.json(await Profile.find().populate('user', 'name').sort({ updatedAt: -1 }).limit(100))));
  app.get('/api/profiles/me', auth, asyncRoute(async (req, res) => res.json(await Profile.findOne({ user: req.user._id }).populate('user', 'name'))));
  app.get('/api/profiles/:handle', asyncRoute(async (req, res) => {
    const profile = await Profile.findOne({ handle: req.params.handle.toLowerCase() }).populate('user', 'name');
    if (!profile) throw httpError(404, 'Profile not found');
    res.json(profile);
  }));
  app.put('/api/profiles/me', auth, asyncRoute(async (req, res) => {
    const data = parse(profileSchema, req.body);
    if (await Profile.exists({ handle: data.handle, user: { $ne: req.user._id } })) throw httpError(409, 'Handle already taken');
    const profile = await Profile.findOneAndUpdate({ user: req.user._id }, { $set: data, $setOnInsert: { user: req.user._id } }, { new: true, upsert: true, runValidators: true }).populate('user', 'name');
    res.json(profile);
  }));
  for (const kind of ['experience', 'education']) {
    app.post(`/api/profiles/me/${kind}`, auth, asyncRoute(async (req, res) => {
      const profile = await Profile.findOne({ user: req.user._id });
      if (!profile) throw httpError(404, 'Create a profile first');
      profile[kind].unshift(parse(timelineSchema, req.body));
      await profile.save();
      res.status(201).json(await profile.populate('user', 'name'));
    }));
    app.delete(`/api/profiles/me/${kind}/:id`, auth, asyncRoute(async (req, res) => {
      const profile = await Profile.findOne({ user: req.user._id });
      const entry = profile?.[kind].id(objectId(req.params.id));
      if (!entry) throw httpError(404, 'Entry not found');
      entry.deleteOne();
      await profile.save();
      res.json(profile);
    }));
  }
  app.get('/api/posts', asyncRoute(async (req, res) => {
    const page = Math.min(1000, Math.max(1, Number.parseInt(req.query.page, 10) || 1));
    const posts = await Post.find().sort({ createdAt: -1 }).skip((page - 1) * 20).limit(20)
      .populate('user', 'name').populate('comments.user', 'name');
    res.json({ posts, page, hasMore: posts.length === 20 });
  }));
  app.post('/api/posts', auth, asyncRoute(async (req, res) => {
    const { text } = parse(textSchema, req.body);
    const post = await Post.create({ user: req.user._id, text });
    res.status(201).json(await post.populate('user', 'name'));
  }));
  app.delete('/api/posts/:id', auth, asyncRoute(async (req, res) => {
    const post = await Post.findById(objectId(req.params.id));
    if (!post) throw httpError(404, 'Post not found');
    if (!post.user.equals(req.user._id)) throw httpError(403, 'You can only delete your posts');
    await post.deleteOne(); res.status(204).end();
  }));
  app.put('/api/posts/:id/like', auth, asyncRoute(async (req, res) => {
    const post = await Post.findById(objectId(req.params.id));
    if (!post) throw httpError(404, 'Post not found');
    const index = post.likes.findIndex(id => id.equals(req.user._id));
    if (index < 0) post.likes.push(req.user._id); else post.likes.splice(index, 1);
    await post.save(); res.json({ likes: post.likes });
  }));
  app.post('/api/posts/:id/comments', auth, asyncRoute(async (req, res) => {
    const { text } = parse(textSchema, req.body);
    const post = await Post.findById(objectId(req.params.id));
    if (!post) throw httpError(404, 'Post not found');
    post.comments.push({ user: req.user._id, text });
    await post.save(); res.status(201).json(await post.populate('comments.user', 'name'));
  }));
  app.delete('/api/posts/:id/comments/:commentId', auth, asyncRoute(async (req, res) => {
    const post = await Post.findById(objectId(req.params.id));
    const comment = post?.comments.id(objectId(req.params.commentId));
    if (!comment) throw httpError(404, 'Comment not found');
    if (!comment.user.equals(req.user._id) && !post.user.equals(req.user._id)) throw httpError(403, 'Cannot delete this comment');
    comment.deleteOne(); await post.save(); res.status(204).end();
  }));
  app.use('/api', (_req, _res, next) => next(httpError(404, 'Route not found')));
  if (staticPath) {
    app.use(express.static(staticPath));
    app.get('*', (req, res, next) => {
      if (path.extname(req.path)) return res.sendStatus(404);
      res.sendFile(path.join(staticPath, 'index.html'), err => { if (err) next(err); });
    });
  }
  app.use((err, _req, res, _next) => {
    if (err instanceof ZodError) return res.status(400).json({ error: err.issues[0]?.message || 'Invalid input' });
    if (err.code === 11000) return res.status(409).json({ error: 'Email or handle already exists' });
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ID' });
    if (err instanceof SyntaxError && err.status === 400) return res.status(400).json({ error: 'Invalid JSON' });
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err); res.status(500).json({ error: 'Server error' });
  });
  return app;
}
