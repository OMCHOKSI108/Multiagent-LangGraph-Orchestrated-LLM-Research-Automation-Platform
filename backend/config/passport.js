const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const db = require('./db');

// --- Google Strategy ---
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.API_BASE_URL || 'http://localhost:5000'}/auth/google/callback`
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
                if (!email) {
                    return done(new Error("No email found from Google profile"), null);
                }

                // Check if user already exists by email OR provider id
                let result = await db.query(
                    "SELECT * FROM users WHERE email = $1 OR (provider = 'google' AND provider_id = $2)",
                    [email, profile.id]
                );

                let user = result.rows[0];

                if (user) {
                    // Return existing user
                    return done(null, user);
                } else {
                    // Create new user
                    const username = profile.displayName || email.split('@')[0];
                    const avatar = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

                    const insertResult = await db.query(
                        "INSERT INTO users (username, email, provider, provider_id, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING *",
                        [username, email, 'google', profile.id, avatar]
                    );
                    return done(null, insertResult.rows[0]);
                }
            } catch (error) {
                return done(error, null);
            }
        }));
}

// --- GitHub Strategy ---
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${process.env.API_BASE_URL || 'http://localhost:5000'}/auth/github/callback`,
        scope: ['user:email']
    },
        async (accessToken, refreshToken, profile, done) => {
            try {
                let email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
                if (!email) {
                    return done(new Error("No email found from GitHub profile. Ensure your GitHub email is public or scope allows fetching."), null);
                }

                // Check if user exists
                let result = await db.query(
                    "SELECT * FROM users WHERE email = $1 OR (provider = 'github' AND provider_id = $2)",
                    [email, profile.id]
                );

                let user = result.rows[0];

                if (user) {
                    return done(null, user);
                } else {
                    const username = profile.username || email.split('@')[0];
                    const avatar = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

                    const insertResult = await db.query(
                        "INSERT INTO users (username, email, provider, provider_id, avatar_url) VALUES ($1, $2, $3, $4, $5) RETURNING *",
                        [username, email, 'github', profile.id, avatar]
                    );
                    return done(null, insertResult.rows[0]);
                }
            } catch (error) {
                return done(error, null);
            }
        }));
}

module.exports = passport;
