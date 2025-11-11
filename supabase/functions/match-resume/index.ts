import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resume_skills, job_skills } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Matching resume to job...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert recruiter analyzing candidate fit. Calculate a match score (0-100) based on skill overlap, considering exact matches and synonyms. Provide a brief explanation.',
          },
          {
            role: 'user',
            content: `Job requires: ${job_skills.join(', ')}\n\nCandidate has: ${resume_skills.join(', ')}\n\nCalculate match score and explain why.`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'calculate_match',
              description: 'Calculate resume-job match score',
              parameters: {
                type: 'object',
                properties: {
                  match_score: {
                    type: 'number',
                    description: 'Match score from 0 to 100',
                  },
                  explanation: {
                    type: 'string',
                    description: 'Brief explanation of the score',
                  },
                  matched_skills: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Skills that matched',
                  },
                  missing_skills: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Required skills that are missing',
                  },
                },
                required: ['match_score', 'explanation'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'calculate_match' } },
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0]?.message?.tool_calls?.[0];
    const result = toolCall ? JSON.parse(toolCall.function.arguments) : {
      match_score: 0,
      explanation: 'Unable to calculate match',
    };

    console.log('Match score:', result.match_score);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in match-resume:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
