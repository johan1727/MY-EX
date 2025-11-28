import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || 'AIzaSyBr-IEjF68VRGNZJI1MJsl4GYmoRjRsMKE';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();

    // In a real app, you would fetch the user's goal from the database here
    // const { data: profile } = await supabase.from('profiles').select('goal').eq('id', user.id).single();
    // const goal = profile?.goal || 'move_on';

    // For now, we'll use a generic empathetic system prompt
    const systemPrompt = `
      You are "My Ex Coach", an empathetic but firm AI assistant helping users through a breakup.
      Your goal is to provide emotional support and objective analysis.
      Keep your responses concise (under 100 words) and conversational.
      If the user seems distressed, offer grounding exercises.
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I am ready to help you heal and move forward. What's on your mind?" }],
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});