import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Creating demo users...');

    // Create admin user
    const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
      email: 'admin@demo.com',
      password: 'Demo@12345',
      email_confirm: true,
      user_metadata: { name: 'Admin User' },
    });

    if (adminAuthError && !adminAuthError.message.includes('already registered')) {
      throw adminAuthError;
    }

    // Create recruiter user
    const { data: recruiterAuth, error: recruiterAuthError } = await supabase.auth.admin.createUser({
      email: 'recruiter@demo.com',
      password: 'Demo@12345',
      email_confirm: true,
      user_metadata: { name: 'Recruiter User' },
    });

    if (recruiterAuthError && !recruiterAuthError.message.includes('already registered')) {
      throw recruiterAuthError;
    }

    // Get user IDs
    const { data: users } = await supabase.from('users').select('*');
    const adminUser = users?.find(u => u.email === 'admin@demo.com');
    const recruiterUser = users?.find(u => u.email === 'recruiter@demo.com');

    if (!adminUser || !recruiterUser) {
      throw new Error('Demo users not found');
    }

    // Update roles
    await supabase.from('users').update({ role: 'admin', country: 'IN' }).eq('id', adminUser.id);
    await supabase.from('users').update({ role: 'recruiter', country: 'US' }).eq('id', recruiterUser.id);

    console.log('Creating demo jobs...');

    const jobs = [
      {
        owner_id: adminUser.id,
        title: 'Frontend Engineer',
        department: 'Engineering',
        location_country: 'India',
        employment_type: 'Full-time',
        jd_text: 'We are looking for an experienced Frontend Engineer skilled in React, TypeScript, HTML, CSS, REST APIs, and Jest testing.',
        required_skills: ['React', 'TypeScript', 'HTML', 'CSS', 'REST', 'Jest'],
        visibility: 'public',
      },
      {
        owner_id: adminUser.id,
        title: 'Data Analyst',
        department: 'Analytics',
        location_country: 'USA',
        employment_type: 'Full-time',
        jd_text: 'Seeking a Data Analyst with expertise in SQL, Python, Pandas, Power BI, and ETL processes.',
        required_skills: ['SQL', 'Python', 'Pandas', 'Power BI', 'ETL'],
        visibility: 'public',
      },
      {
        owner_id: adminUser.id,
        title: 'Backend Engineer',
        department: 'Engineering',
        location_country: 'Remote',
        employment_type: 'Full-time',
        jd_text: 'Looking for a Backend Engineer proficient in Node.js, PostgreSQL, Prisma, Docker, and CI/CD.',
        required_skills: ['Node.js', 'PostgreSQL', 'Prisma', 'Docker', 'CI/CD'],
        visibility: 'private',
      },
    ];

    const { data: createdJobs, error: jobsError } = await supabase
      .from('jobs')
      .insert(jobs)
      .select();

    if (jobsError) throw jobsError;

    console.log('Creating demo resumes...');

    const resumes = [
      {
        owner_id: adminUser.id,
        matched_job_id: createdJobs[0].id,
        candidate_name: 'Ayesha Khan',
        email: 'ayesha.khan@example.com',
        phone: '+91-9876543210',
        country: 'IN',
        file_url: 'demo://ayesha-khan-resume.pdf',
        raw_text: 'Frontend Developer with 2.5 years of experience in React, TypeScript, Redux, and Jest...',
        extracted_skills: ['React', 'TypeScript', 'Redux', 'Jest', 'HTML', 'CSS'],
        match_score: 85,
        explain_text: 'Strong match with 5/6 required skills. Missing REST API experience.',
        stage: 'reviewed',
        visibility: 'public',
      },
      {
        owner_id: adminUser.id,
        matched_job_id: createdJobs[2].id,
        candidate_name: 'Rohit Verma',
        email: 'rohit.verma@example.com',
        phone: '+91-9123456789',
        country: 'IN',
        file_url: 'demo://rohit-verma-resume.pdf',
        raw_text: 'Backend Developer with 3 years experience in Node.js, PostgreSQL, Docker...',
        extracted_skills: ['Node.js', 'PostgreSQL', 'Docker', 'Express', 'MongoDB'],
        match_score: 75,
        explain_text: 'Good match with core backend skills. Missing Prisma and CI/CD experience.',
        stage: 'shortlisted',
        visibility: 'private',
      },
      {
        owner_id: recruiterUser.id,
        matched_job_id: createdJobs[1].id,
        candidate_name: 'Sofia Martinez',
        email: 'sofia.martinez@example.com',
        phone: '+1-555-0123',
        country: 'US',
        file_url: 'demo://sofia-martinez-resume.pdf',
        raw_text: 'Data Analyst with 4 years experience in SQL, Python, Power BI...',
        extracted_skills: ['SQL', 'Python', 'Power BI', 'Excel', 'Tableau'],
        match_score: 90,
        explain_text: 'Excellent match with all core skills plus additional BI tools.',
        stage: 'shortlisted',
        visibility: 'public',
      },
      {
        owner_id: recruiterUser.id,
        matched_job_id: createdJobs[0].id,
        candidate_name: 'Liam O\'Connor',
        email: 'liam.oconnor@example.com',
        phone: '+353-1-234-5678',
        country: 'IE',
        file_url: 'demo://liam-oconnor-resume.pdf',
        raw_text: 'Frontend Engineer with 3 years in React, Next.js, Cypress testing...',
        extracted_skills: ['React', 'Next.js', 'TypeScript', 'Cypress', 'GraphQL'],
        match_score: 80,
        explain_text: 'Strong React and TypeScript skills, but using different testing framework.',
        stage: 'reviewed',
        visibility: 'public',
      },
      {
        owner_id: adminUser.id,
        matched_job_id: createdJobs[1].id,
        candidate_name: 'Wei Zhang',
        email: 'wei.zhang@example.com',
        phone: '+86-10-1234-5678',
        country: 'CN',
        file_url: 'demo://wei-zhang-resume.pdf',
        raw_text: 'Data Engineer with 5 years experience in Python, Pandas, Airflow, ETL...',
        extracted_skills: ['Python', 'Pandas', 'Airflow', 'ETL', 'Spark'],
        match_score: 70,
        explain_text: 'Strong data engineering skills but limited BI tool experience.',
        stage: 'new',
        visibility: 'public',
      },
      {
        owner_id: recruiterUser.id,
        matched_job_id: createdJobs[2].id,
        candidate_name: 'Nora Ali',
        email: 'nora.ali@example.com',
        phone: '+971-4-123-4567',
        country: 'AE',
        file_url: 'demo://nora-ali-resume.pdf',
        raw_text: 'Cloud Backend Developer with 2 years in Node.js, Prisma, AWS...',
        extracted_skills: ['Node.js', 'Prisma', 'AWS', 'Lambda', 'DynamoDB'],
        match_score: 65,
        explain_text: 'Good Node.js and Prisma skills, AWS experience valuable but different stack.',
        stage: 'new',
        visibility: 'private',
      },
    ];

    const { error: resumesError } = await supabase.from('resumes').insert(resumes);

    if (resumesError) throw resumesError;

    console.log('Demo data seeded successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo data created successfully',
        credentials: {
          admin: { email: 'admin@demo.com', password: 'Demo@12345' },
          recruiter: { email: 'recruiter@demo.com', password: 'Demo@12345' },
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
