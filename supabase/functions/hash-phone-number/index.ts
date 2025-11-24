import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { parsePhoneNumberFromString } from "https://esm.sh/libphonenumber-js@1.10.57";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import "https://deno.land/x/dotenv@v3.2.0/load.ts"; // Load environment variables

// Ensure the PHONE_HASH_SALT environment variable is set
const SALT = Deno.env.get("PHONE_HASH_SALT");
if (!SALT) {
  console.error("Error: PHONE_HASH_SALT environment variable is not set.");
  // In a real application, you might throw an error or handle this more gracefully
  // For now, we'll proceed but log the error. Hashing will be less secure without a salt.
}

async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message); // encode as UTF-8
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8); // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(""); // convert bytes to hex string
  return hashHex;
}

serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // TODO: Add authentication check here.
  // Example: Check for Authorization header, verify JWT, etc.
  // const authHeader = req.headers.get('Authorization')
  // if (!authHeader || !isValidJwt(authHeader)) {
  //   return new Response(JSON.stringify({ error: 'Unauthorized' }), {
  //     status: 401,
  //     headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  //   })
  // }

  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'phoneNumber' field" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse and normalize the phone number
    const parsedNumber = parsePhoneNumberFromString(phoneNumber, "US"); // Assuming US default, adjust if needed

    if (!parsedNumber || !parsedNumber.isValid()) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const normalizedNumber = parsedNumber.format("E.164"); // e.g., +14155552671

    // Salt and hash
    const saltedNumber = normalizedNumber + (SALT || ""); // Concatenate with salt (or empty string if salt missing)
    const hash = await sha256(saltedNumber);

    return new Response(JSON.stringify({ hash }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Function error:", error);
    const errorMessage = (error instanceof Error) ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/*
Test Payload Example:
POST /functions/v1/hash-phone-number
Authorization: Bearer <SUPABASE_ANON_KEY or SERVICE_ROLE_KEY>
Content-Type: application/json

{
  "phoneNumber": "415-555-2671"
}

Expected Success Response (200):
{
  "hash": "<sha256_hex_string>"
}

Expected Error Response (400 - Invalid Input):
{
  "error": "Invalid phone number format"
}
*/ 