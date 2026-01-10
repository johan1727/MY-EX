
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { input, batch } = await req.json();

    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY in server environment");
    }

    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    if (batch && Array.isArray(batch)) {
      // Handle batch embeddings
      // Note: Gemini SDK doesn't support batch embedding directly in this version easily, 
      // so we map promises. For production large scale, we might want to chunk this.
      const promises = batch.map(async (text) => {
        const result = await model.embedContent(text);
        return result.embedding.values;
      });
      const embeddings = await Promise.all(promises);

      return new Response(JSON.stringify({ embeddings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (input) {
      // Handle single embedding
      const result = await model.embedContent(input);
      const embedding = result.embedding.values;

      return new Response(JSON.stringify({ embedding }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid request. Provide 'input' (string) or 'batch' (string[]).");

  } catch (error) {
    console.error("Error in embeddings function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
