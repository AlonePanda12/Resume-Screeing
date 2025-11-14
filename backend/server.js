require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { createClient } = require('@supabase/supabase-js');
const natural = require('natural');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'tmp/' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// helper: extract text from file
async function extractTextFromFile(localPath, originalname) {
  const ext = path.extname(originalname).toLowerCase();
  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(localPath);
    const data = await pdf(dataBuffer);
    return data.text;
  } else if (ext === '.docx') {
    const res = await mammoth.extractRawText({ path: localPath });
    return res.value;
  } else {
    // fallback read
    return fs.readFileSync(localPath, 'utf8');
  }
}

// helper: simple JD keyword extractor
function extractKeywords(text) {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize((text || '').toLowerCase());
  const stopWords = natural.stopwords || []; // library stopwords
  const filtered = tokens.filter(t => t.length > 2 && !stopWords.includes(t));
  const stemmed = filtered.map(w => natural.PorterStemmer.stem(w));
  return Array.from(new Set(stemmed)).slice(0, 200);
}

// scoring function: count matched keywords / total jd keywords
function scoreResume(extractedText, jdKeywords) {
  const tokenizer = new natural.WordTokenizer();
  const resTokens = tokenizer.tokenize((extractedText || '').toLowerCase());
  const resStem = resTokens.map(w => natural.PorterStemmer.stem(w));
  const matched = jdKeywords.filter(k => resStem.includes(k));
  const score = jdKeywords.length ? (matched.length / jdKeywords.length) * 100 : 0;
  return { score: Math.round(score * 100) / 100, matched };
}

app.post('/upload-resume', upload.single('resume'), async (req, res) => {
  try {
    const file = req.file;
    const { jd_id } = req.body;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    // 1) extract text locally
    const extractedText = await extractTextFromFile(file.path, file.originalname);

    // 2) fetch JD from Supabase (using 'jobs' table)
    const { data: jdRows, error: jdError } = await supabase
      .from('jobs')
      .select('jd_text, required_skills')
      .eq('id', jd_id)
      .maybeSingle();

    if (jdError) {
      console.error(jdError);
      return res.status(400).json({ error: 'Failed to fetch job description' });
    }

    if (!jdRows) {
      return res.status(404).json({ error: 'Job description not found' });
    }

    let jdKeywords = jdRows.required_skills || [];
    if (!jdKeywords || jdKeywords.length === 0) {
      jdKeywords = extractKeywords(jdRows.jd_text || '');
      // optional: update job row with keywords
      await supabase.from('jobs').update({ required_skills: jdKeywords }).eq('id', jd_id);
    }

    // 3) score resume
    const { score, matched } = scoreResume(extractedText, jdKeywords);

    // 4) get authenticated user
    const authHeader = req.headers.authorization;
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      if (!userError && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      fs.unlinkSync(file.path);
      return res.status(401).json({ error: 'Unauthorized: Please provide valid authentication token' });
    }

    // 5) upload file to Supabase Storage
    const fileBuffer = fs.readFileSync(file.path);
    const storagePath = `${userId}/${Date.now()}_${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (uploadError) {
      console.error('uploadError', uploadError);
      fs.unlinkSync(file.path);
      return res.status(500).json({ error: 'Failed to upload file to storage' });
    }

    const { data: { publicUrl } } = supabase.storage.from('resumes').getPublicUrl(storagePath);

    // 6) extract candidate name from filename
    const candidateName = file.originalname.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');

    // 7) save metadata to resumes table
    const { data: insertData, error: insertError } = await supabase
      .from('resumes')
      .insert([{
        owner_id: userId,
        matched_job_id: jd_id,
        candidate_name: candidateName,
        file_url: publicUrl,
        raw_text: extractedText,
        extracted_skills: matched,
        match_score: Math.round(score),
        stage: 'new',
        visibility: 'private'
      }]).select().single();

    // clean up tmp file
    fs.unlinkSync(file.path);

    if (insertError) {
      console.error(insertError);
      return res.status(500).json({ error: 'DB insert failed' });
    }

    return res.json({ success: true, score, matched, resume: insertData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
