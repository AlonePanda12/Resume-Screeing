// server.js
const cors = require('cors');
app.use(cors());

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { createClient } = require('@supabase/supabase-js');
const natural = require('natural');
const path = require('path');

const upload = multer({ dest: 'tmp/' });
const app = express();
app.use(express.json());

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

    // 2) fetch JD from Supabase
    const { data: jdRows, error: jdError } = await supabase
      .from('job_descriptions')
      .select('description, keywords')
      .eq('id', jd_id)
      .limit(1)
      .single();

    if (jdError) {
      console.error(jdError);
      // if jd not found, respond error
      return res.status(400).json({ error: 'Job description not found' });
    }

    let jdKeywords = jdRows.keywords || [];
    if (!jdKeywords || jdKeywords.length === 0) {
      jdKeywords = extractKeywords(jdRows.description || '');
      // optional: update JD row with keywords
      await supabase.from('job_descriptions').update({ keywords: jdKeywords }).eq('id', jd_id);
    }

    // 3) score resume
    const { score, matched } = scoreResume(extractedText, jdKeywords);

    // 4) upload file to Supabase Storage
    const fileStream = fs.createReadStream(file.path);
    const storagePath = `resumes/${Date.now()}_${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('uploads') // create a bucket named 'uploads' in Supabase Storage
      .upload(storagePath, file.path, { upsert: false });

    if (uploadError) {
      console.error('uploadError', uploadError);
      // fallback: continue but mark file_url empty
    }

    const publicUrl = supabase.storage.from('uploads').getPublicUrl(storagePath).publicURL;

    // 5) save metadata to resumes table
    const { data: insertData, error: insertError } = await supabase
      .from('resumes')
      .insert([{
        file_url: publicUrl,
        file_name: file.originalname,
        extracted_text: extractedText,
        score,
        matched_skills: matched,
        jd_id
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
