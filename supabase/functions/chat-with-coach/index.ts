import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyBr-IEjF68VRGNZJI1MJsl4GYmoRjRsMKE';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to calculate days since breakup
function calculateDaysSinceBreakup(breakupDate: string): number {
  const breakup = new Date(breakupDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - breakup.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Get tone guidance based on time since breakup
function getToneGuidance(daysSinceBreakup: number): string {
  if (daysSinceBreakup < 7) {
    return `Your tone should be IMMEDIATE CONTAINMENT and VALIDATION. The wound is fresh. Avoid phrases like "it will pass" or "there are more fish in the sea". Focus on making them feel heard and grounding techniques.`;
  } else if (daysSinceBreakup < 30) {
    return `Your tone should be ACTIVE SUPPORT. The initial crisis has passed. Help them establish healthy routines and process emotions. You can start talking about self-care and personal rediscovery.`;
  } else if (daysSinceBreakup < 90) {
    return `Your tone should be GENTLE EMPOWERMENT. There's some distance now. Focus on identity reconstruction, new habits, and small goals. Celebrate their progress.`;
  } else {
    return `Your tone should be GROWTH AND NEW GOALS. There's perspective now. You can be more direct about patterns to change and looking forward. Help them close pending cycles.`;
  }
}

// Get context about who ended the relationship
function getWhoEndedContext(whoEnded?: string): string {
  if (whoEnded === 'them') {
    return 'Their ex ended the relationship (they may feel rejected, abandoned, or not good enough)';
  } else if (whoEnded === 'me') {
    return 'They ended the relationship (they may feel guilt, doubt, or wonder if they made the right choice)';
  } else if (whoEnded === 'mutual') {
    return 'It was a mutual decision (they may feel confused about mixed emotions)';
  }
  return 'Breakup circumstances unknown';
}

// Build personalized system prompt
function buildPersonalizedPrompt(userData: any): string {
  const daysSinceBreakup = userData.breakup_date
    ? calculateDaysSinceBreakup(userData.breakup_date)
    : null;

  const toneGuidance = daysSinceBreakup
    ? getToneGuidance(daysSinceBreakup)
    : 'Your tone should be empathetic and supportive.';

  const whoEndedContext = getWhoEndedContext(userData.who_ended);

  const strugglesText = userData.main_struggles && userData.main_struggles.length > 0
    ? userData.main_struggles.join(', ')
    : 'Not specified';

  const userName = userData.user_name || 'there';

  const goalContext = userData.goal === 'move_on'
    ? 'They want to heal and move on with their life'
    : userData.goal === 'get_back'
      ? 'They want to get back together with their ex (guide them wisely - sometimes the best path is moving on)'
      : 'They want to learn and grow from this experience';

  return `You are an empathetic Ex Coach powered by AI, specialized in helping people heal after breakups.

USER CONTEXT:
- Name: ${userData.user_name || 'User'}
- Breakup: ${daysSinceBreakup ? `${daysSinceBreakup} days ago` : 'Recent'}
- Who ended it: ${whoEndedContext}
- Current mood: ${userData.current_mood ? `${userData.current_mood}/10` : 'Not specified'}
- Relationship duration: ${userData.relationship_duration || 'Not specified'}
- Main struggles: ${strugglesText}
- Goal: ${goalContext}

TONE GUIDANCE:
${toneGuidance}

YOUR APPROACH:
- Use their name (${userName}) occasionally to create connection, but don't overdo it
- Reference their specific struggles when relevant
- Adjust your advice based on how long ago the breakup was
- Be warm, understanding, and non-judgmental
- Validate their feelings while gently challenging unhealthy patterns
- Provide actionable advice, not just sympathy
- Celebrate their progress, no matter how small
- Be direct but kind when they're falling into toxic patterns

IMPORTANT GUIDELINES:
- If they mention wanting to contact their ex, remind them of their progress and suggest healthier alternatives
- If they're in the "get back together" goal, be realistic - help them evaluate if it's truly healthy
- Watch for signs of depression or self-harm - if detected, gently suggest professional help
- Don't make promises about the future ("they'll come back", "you'll find someone better")
- Focus on their growth and healing, not on the ex

RESPONSE STYLE:
- Keep responses concise but meaningful (2-4 paragraphs max)
- Use empathetic language but avoid being overly soft
- Ask thoughtful questions to help them reflect
- Provide specific, actionable suggestions
- Use occasional emojis for warmth, but don't overuse them

Remember: You're a coach, not a therapist. Your role is to guide, support, and sometimes give tough love when needed.`;
}

// Basic prompt for users who haven't completed extended onboarding
function buildBasicPrompt(goal?: string): string {
  const goalContext = goal === 'move_on'
    ? 'They want to heal and move on with their life'
    : goal === 'get_back'
      ? 'They want to get back together with their ex'
      : 'They want to learn and grow from this experience';

  return `You are an empathetic Ex Coach powered by AI, specialized in helping people heal after breakups.

USER GOAL: ${goalContext}

YOUR APPROACH:
- Be warm, understanding, and non-judgmental
- Validate their feelings while gently challenging unhealthy patterns
- Provide actionable advice, not just sympathy
- Be direct but kind when they're falling into toxic patterns

RESPONSE STYLE:
- Keep responses concise but meaningful (2-4 paragraphs max)
- Ask thoughtful questions to help them reflect
- Provide specific, actionable suggestions

Remember: You're a coach, not a therapist. Your role is to guide, support, and sometimes give tough love when needed.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's onboarding data
    let systemPrompt = buildBasicPrompt();

    if (userId) {
      const { data: userData, error } = await supabase
        .from('users')
        .select('user_name, breakup_date, who_ended, current_mood, relationship_duration, main_struggles, goal, onboarding_completed')
        .eq('id', userId)
        .single();

      if (!error && userData && userData.onboarding_completed) {
        systemPrompt = buildPersonalizedPrompt(userData);
      } else if (!error && userData) {
        systemPrompt = buildBasicPrompt(userData.goal);
      }
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I'm here to support you through this. What's on your mind?" }],
        },
      ],
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();

    return new Response(
      JSON.stringify({ reply: text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});