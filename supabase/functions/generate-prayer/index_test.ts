import { assertEquals, assertExists } from "@std/assert";
import { stub } from "@std/testing/mock";
import { handleGeneratePrayerRequest } from "./index.ts"; 

// --- Types (Duplicated from index.ts for test context) ---
// Type for the expected changes payload from the client
interface SessionChanges {
  mood?: { from: string | null; to: string };
  toggledIntentions?: { id: string; toState: boolean }[];
}

// --- Mock Data ---
const MOCK_USER_ID = "user-123";
const MOCK_NESTJS_PRIMARY_URL = "http://mock-nestjs-primary.local/generate-prayer";
const MOCK_NESTJS_SECONDARY_URL = "http://mock-nestjs-secondary.local/generate-prayer";
const MOCK_SUPABASE_URL = "http://mock-supabase.local";
const MOCK_SUPABASE_ANON_KEY = "mock-anon-key";
const MOCK_PROFILE_NO_HISTORY = { id: MOCK_USER_ID, display_name: "Test User", mood: "Hopeful", last_openai_response_id: null, onboarding_completed_at: new Date().toISOString() };
const MOCK_PROFILE_WITH_HISTORY = { ...MOCK_PROFILE_NO_HISTORY, last_openai_response_id: "resp-abc" };
const MOCK_INTENTIONS = [
    { id: "int-1", person_id: "p-1", category: "Health", details: "Recover from cold", is_active: true, prayer_focus_people: { name: "Mom", relationship: "Mother" } },
    { id: "int-2", person_id: "p-2", category: "Guidance", details: "For job interview", is_active: true, prayer_focus_people: { name: "Friend", relationship: "Friend" } },
];
const MOCK_NESTJS_RESPONSE = { prayer: "This is a generated prayer.", responseId: "resp-xyz" };

// --- Test Suite ---
Deno.test("generate-prayer Edge Function Tests", async (t) => {
  // Setup stubs for environment and network requests
  let fetchStub: any;
  let envGetStub: any;

  // Helper to set up the stubs before each test
  let primaryCalls = 0;
  let secondaryCalls = 0;

  function setupStubs(options: {
    mockProfileData?: any;
    mockIntentionsData?: any[];
    primaryStatus?: number;
    secondaryStatus?: number;
    enableSecondary?: boolean;
  } = {}) {
    // Default values
    const {
      mockProfileData = MOCK_PROFILE_NO_HISTORY,
      mockIntentionsData = MOCK_INTENTIONS,
      primaryStatus = 200,
      secondaryStatus = 200,
      enableSecondary = false,
    } = options;
    
    primaryCalls = 0;
    secondaryCalls = 0;

    // Mock environment variables - use simple function
    envGetStub = stub(Deno.env, "get", (key: string) => {
      if (key === "NESTJS_PRAYER_SERVICE_URL_PRIMARY") return MOCK_NESTJS_PRIMARY_URL;
      if (key === "NESTJS_PRAYER_SERVICE_URL") return MOCK_NESTJS_PRIMARY_URL;
      if (key === "NESTJS_PRAYER_SERVICE_URL_SECONDARY" && enableSecondary) return MOCK_NESTJS_SECONDARY_URL;
      if (key === "SUPABASE_URL") return MOCK_SUPABASE_URL;
      if (key === "SUPABASE_ANON_KEY") return MOCK_SUPABASE_ANON_KEY;
      return undefined;
    });
    
    // Mock fetch with a URL-aware implementation
    fetchStub = stub(globalThis, "fetch", (url: string | URL | Request, init?: RequestInit) => {
      const urlString = typeof url === "string" ? url : 
                        url instanceof URL ? url.toString() : 
                        url instanceof Request ? url.url : "";
      
      // Handle Supabase API calls
      if (urlString.includes('profiles')) {
        const responsePayload = JSON.stringify(mockProfileData);
        return Promise.resolve(new Response(
          responsePayload,
          { status: 200, headers: { "Content-Type": "application/json" } }
        ));
      }
      
      if (urlString.includes('prayer_intentions')) {
        const responsePayload = JSON.stringify(mockIntentionsData);
        return Promise.resolve(new Response(
          responsePayload,
          { status: 200, headers: { "Content-Type": "application/json" } }
        ));
      }
      
      // Handle NestJS API call
      if (urlString.includes('generate-prayer')) {
        if (urlString.includes('mock-nestjs-primary')) {
          primaryCalls += 1;
          if (primaryStatus !== 200) {
            return Promise.resolve(new Response(
              JSON.stringify({ error: "Primary failure" }),
              { status: primaryStatus, headers: { "Content-Type": "application/json" } }
            ));
          }
          return Promise.resolve(new Response(
            JSON.stringify(MOCK_NESTJS_RESPONSE),
            { status: 200, headers: { "Content-Type": "application/json" } }
          ));
        }

        if (urlString.includes('mock-nestjs-secondary')) {
          secondaryCalls += 1;
          if (secondaryStatus !== 200) {
            return Promise.resolve(new Response(
              JSON.stringify({ error: "Secondary failure" }),
              { status: secondaryStatus, headers: { "Content-Type": "application/json" } }
            ));
          }
          return Promise.resolve(new Response(
            JSON.stringify(MOCK_NESTJS_RESPONSE),
            { status: 200, headers: { "Content-Type": "application/json" } }
          ));
        }

        if (primaryStatus !== 200) {
          return Promise.resolve(new Response(
            JSON.stringify({ error: "Primary failure" }),
            { status: primaryStatus, headers: { "Content-Type": "application/json" } }
          ));
        }
        return Promise.resolve(new Response(
          JSON.stringify(MOCK_NESTJS_RESPONSE),
          { status: 200, headers: { "Content-Type": "application/json" } }
        ));
      }
      
      // Fallback for any other unexpected URL
      console.warn(`[MockFetch] Unhandled URL: ${urlString}`);
      return Promise.resolve(new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      ));
    });
  }

  // Helper to clean up stubs after each test
  function tearDown() {
    if (fetchStub) fetchStub.restore();
    if (envGetStub) envGetStub.restore();
  }

  await t.step("validates required parameters", async () => {
    setupStubs();
    try {
      // Test missing userId
      const requestNoUserId = new Request("http://localhost/generate-prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: "morning" }),
      });
      
      const responseNoUserId = await handleGeneratePrayerRequest(requestNoUserId);
      assertEquals(responseNoUserId.status, 400);
      const bodyNoUserId = await responseNoUserId.json();
      assertEquals(bodyNoUserId.error, "Missing userId");
      
      // Test missing slot
      const requestNoSlot = new Request("http://localhost/generate-prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: MOCK_USER_ID }),
      });
      
      const responseNoSlot = await handleGeneratePrayerRequest(requestNoSlot);
      assertEquals(responseNoSlot.status, 400);
      const bodyNoSlot = await responseNoSlot.json();
      assertEquals(bodyNoSlot.error, "Missing slot");
    } finally {
      tearDown();
    }
  });

  await t.step("first prayer: fetches profile and active intentions", async () => {
    setupStubs();
    try {
      const request = new Request("http://localhost/generate-prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: MOCK_USER_ID, slot: "morning" }),
      });
      
      const response = await handleGeneratePrayerRequest(request);
      assertEquals(response.status, 200);
      
      const responseBody = await response.json();
      assertEquals(responseBody.prayer, MOCK_NESTJS_RESPONSE.prayer);
      
      // Verify fetch was called with the right URLs (done implicitly by the mock implementation)
      assertEquals(fetchStub.calls.length >= 3, true, "Should have called fetch at least 3 times");
    } finally {
      tearDown();
    }
  });

  await t.step("subsequent prayer: handles changes_from_review_screen", async () => {
    // Use profile with history for this test
    setupStubs({ mockProfileData: MOCK_PROFILE_WITH_HISTORY });
    try {
      const changes: SessionChanges = {
        mood: { from: "Hopeful", to: "Weary" },
        toggledIntentions: [
          { id: "int-1", toState: false }, // Turning off an intention
          { id: "int-3", toState: true },  // Turning on a new intention
        ],
      };
      
      const request = new Request("http://localhost/generate-prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: MOCK_USER_ID,
          slot: "evening",
          changes_from_review_screen: changes,
        }),
      });
      
      const response = await handleGeneratePrayerRequest(request);
      assertEquals(response.status, 200);
      
      const responseBody = await response.json();
      assertEquals(responseBody.prayer, MOCK_NESTJS_RESPONSE.prayer);
      
      // In subsequent prayer mode, we should NOT fetch all intentions
      // but we should fetch details for specific changed intentions
      const fetchCalls = fetchStub.calls;
      let intentionsQueryFound = false;
      
      for (const call of fetchCalls) {
        const urlArg = call.args[0];
        const url = typeof urlArg === "string" ? urlArg : 
                  urlArg instanceof URL ? urlArg.toString() : 
                  urlArg instanceof Request ? urlArg.url : "";
                  
        if (url.includes('prayer_intentions') && url.includes('int-1')) {
          intentionsQueryFound = true;
          break;
        }
      }
      
      assertEquals(intentionsQueryFound, true, "Should fetch details for changed intentions");
    } finally {
      tearDown();
    }
  });

  await t.step("handles NestJS service error", async () => {
    setupStubs({ primaryStatus: 500 });
    try {
      const request = new Request("http://localhost/generate-prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: MOCK_USER_ID, slot: "morning" }),
      });
      
      const response = await handleGeneratePrayerRequest(request);
      assertEquals(response.status, 500);
      
      const responseBody = await response.json();
      assertExists(responseBody.error);
    } finally {
      tearDown();
    }
  });

  await t.step("falls back to secondary when primary fails", async () => {
    setupStubs({ primaryStatus: 500, secondaryStatus: 200, enableSecondary: true });
    try {
      const request = new Request("http://localhost/generate-prayer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: MOCK_USER_ID, slot: "morning" }),
      });

      const response = await handleGeneratePrayerRequest(request);
      assertEquals(response.status, 200);
      const responseBody = await response.json();
      assertEquals(responseBody.prayer, MOCK_NESTJS_RESPONSE.prayer);
      assertEquals(primaryCalls, 1);
      assertEquals(secondaryCalls, 1);
    } finally {
      tearDown();
    }
  });
});

// Note: This test setup relies heavily on mocking and assumes the handler
// can be tested somewhat in isolation. A crucial missing piece is robustly
// mocking the Supabase client creation/usage within the handler without
// modifying the handler source code (e.g., via dependency injection).
// The current mocks for Supabase client calls might not be fully effective
// depending on how `createClient` is scoped and called within index.ts.
// This test file needs a utility like 'serve' from 'edgeFunctionTestUtils.ts'
// which isn't standard and would need to be created to wrap the handler call. 