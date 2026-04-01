/* eslint-disable no-console */
/**
 * LifeOS single-user server.
 * - Serves static frontend from ./public (index.html + assets).
 * - Provides a simple GET/POST API for your data (data.json).
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");


require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);


app.use(express.static('public'));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  // You can store user info in DB here if needed
  return done(null, { id: profile.id, displayName: profile.displayName, email: profile.emails[0].value });
}));

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: 'Not authenticated' });
}


// Google OAuth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);
app.get('/auth/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/');
  });
});

// Get current user info
app.get('/api/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

// Get data (protected)
app.get('/api/data', ensureAuthenticated, (req, res) => {
  const userId = req.user.id;
  const userFile = path.join(DATA_DIR, userId + '.json');
  fs.readFile(userFile, 'utf8', (err, data) => {
    if (err) return res.json({});
    res.type('json').send(data);
  });
});

// Save data (protected)
app.post('/api/data', ensureAuthenticated, (req, res) => {
  const userId = req.user.id;
  const userFile = path.join(DATA_DIR, userId + '.json');
  fs.writeFile(userFile, JSON.stringify(req.body), (err) => {
    if (err) return res.status(500).send('Error');
    res.send('OK');
  });
});



app.listen(PORT, () => {
  console.log(`LifeOS running on http://localhost:${PORT}`);
  console.log('Google OAuth enabled.');
});

