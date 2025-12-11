const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
const fs = require('fs');

const app = express();
const genAI = new GoogleGenerativeAI("AIzaSyAI8XyPZiLqn0C1SleP9PsnFxmOBFzoXm4");
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database Setup
const db = new sqlite3.Database('./hackathons.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        createTable();
    }
});

function createTable() {
    db.run(`CREATE TABLE IF NOT EXISTS hackathons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        url TEXT,
        description TEXT,
        deadline TEXT,
        prize_pool TEXT,
        difficulty TEXT,
        confidence INTEGER,
        joined INTEGER DEFAULT 0,
        notes TEXT,
        rules TEXT,
        hashtag_counts TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (!err) {
            // Attempt to add new columns if they don't exist (migrations)
            const cols = ['rules', 'hashtag_counts'];
            cols.forEach(col => {
                db.run(`ALTER TABLE hackathons ADD COLUMN ${col} TEXT`, () => {});
            });
        }
    });
}

// Routes

// Get all hackathons
app.get('/api/hackathons', (req, res) => {
    const sql = 'SELECT * FROM hackathons ORDER BY deadline ASC';
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ data: rows });
    });
});

// Add a hackathon
app.post('/api/hackathons', (req, res) => {
    const { title, url, description, deadline, prize_pool, difficulty, confidence, joined, notes, rules, hashtag_counts } = req.body;
    const sql = `INSERT INTO hackathons (title, url, description, deadline, prize_pool, difficulty, confidence, joined, notes, rules, hashtag_counts) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
    const params = [title, url, description, deadline, prize_pool, difficulty, confidence, joined ? 1 : 0, notes, rules, hashtag_counts];
    
    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ 
            message: 'success', 
            data: { id: this.lastID, ...req.body } 
        });
    });
});

// Update a hackathon
app.put('/api/hackathons/:id', (req, res) => {
    const { title, url, description, deadline, prize_pool, difficulty, confidence, joined, notes, rules, hashtag_counts } = req.body;
    const sql = `UPDATE hackathons SET title = ?, url = ?, description = ?, deadline = ?, prize_pool = ?, difficulty = ?, confidence = ?, joined = ?, notes = ?, rules = ?, hashtag_counts = ? WHERE id = ?`;
    const params = [title, url, description, deadline, prize_pool, difficulty, confidence, joined ? 1 : 0, notes, rules, hashtag_counts, req.params.id];
    
    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ 
            message: 'success', 
            changes: this.changes 
        });
    });
});

// Delete a hackathon
app.delete('/api/hackathons/:id', (req, res) => {
    const sql = 'DELETE FROM hackathons WHERE id = ?';
    db.run(sql, req.params.id, function (err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({ message: 'deleted', changes: this.changes });
    });
});

// Scrape URL
app.post('/api/scrape', async (req, res) => {
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    let browser;
    try {
        // Launch Puppeteer
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Optimize: Request interception removed for stability
        // Just rely on domcontentloaded for speed

        // Set User Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Navigate
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Extract Data
        const extracted = await page.evaluate(() => {
            const getMeta = (prop) => document.querySelector(`meta[property="${prop}"]`)?.content || document.querySelector(`meta[name="${prop}"]`)?.content || '';
            
            // Count videos (approximation for Twitter/X)
            const videoCount = document.querySelectorAll('video, [data-testid="videoComponent"]').length;

            return {
                title: getMeta('og:title') || document.title || '',
                url: window.location.href,
                full_text: document.body.innerText.substring(0, 30000), // Limit text for AI
                video_count: videoCount
            };
        });

        // AI Analysis
        try {
            const prompt = `Analyze the following text from a hackathon or event page.
            
            Requirements:
            1. description: Precise, compact summary (Max 3 sentences).
            2. rules: Compact list of key rules (e.g., "Team size 1-4, No prior code").
            3. hashtags: If the text mentions posting on social media with a specific hashtag, extract it (e.g., ["#hackathon2025"]). If none, return [].
            
            Return ONLY a valid JSON object (no markdown) with these keys:
            - title: string
            - description: string
            - deadline: string
            - prize_pool: string
            - difficulty: string (Beginner/Intermediate/Advanced/Hardcore)
            - rules: string (formatted text)
            - hashtags: array of strings
            
            Text:
            ${extracted.full_text.substring(0, 30000)}`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();
            
            // Clean markdown
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const aiData = JSON.parse(text);

            // Check Twitter for hashtags
            let hashtagCountsStr = '';
            if (aiData.hashtags && aiData.hashtags.length > 0) {
                const counts = [];
                for (const tag of aiData.hashtags) {
                    try {
                        const searchUrl = `https://x.com/search?q=${encodeURIComponent(tag)}&src=typed_query&f=media`;
                        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                        
                        // Scroll and count videos
                        let videoCount = 0;
                        let scrolls = 0;
                        while (videoCount < 100 && scrolls < 10) {
                            const newVideos = await page.evaluate(() => document.querySelectorAll('video, [data-testid="videoComponent"]').length);
                            videoCount = newVideos;
                            if (videoCount >= 100) break;
                            
                            await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
                            await new Promise(r => setTimeout(r, 1500));
                            scrolls++;
                        }
                        
                        const countStr = videoCount >= 100 ? '100+' : videoCount.toString();
                        counts.push(`${tag}: ${countStr} videos`);
                    } catch (e) {
                        console.error(`Error checking hashtag ${tag}:`, e.message);
                        counts.push(`${tag}: Check failed`);
                    }
                }
                hashtagCountsStr = counts.join(', ');
            }

            const finalData = {
                ...extracted,
                ...aiData,
                title: aiData.title || extracted.title,
                rules: aiData.rules || '',
                hashtag_counts: hashtagCountsStr
            };

            res.json({ data: finalData });

        } catch (aiError) {
            console.error('AI Error:', aiError);
            // Fallback to basic if AI fails
            res.json({ data: extracted });
        }

    } catch (error) {
        console.error('Scraping error:', error.message);
        res.status(500).json({ error: 'Failed to scrape URL', details: error.message });
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
