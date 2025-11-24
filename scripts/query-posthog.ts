#!/usr/bin/env tsx
/**
 * Query PostHog via API
 * Usage: npx tsx scripts/query-posthog.ts "SELECT event, COUNT() FROM events WHERE timestamp >= now() - INTERVAL 1 DAY GROUP BY event ORDER BY COUNT() DESC LIMIT 10"
 */

import 'dotenv/config';

const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

if (!POSTHOG_API_KEY) {
  console.error('Error: POSTHOG_PERSONAL_API_KEY not found in .env');
  process.exit(1);
}

if (!POSTHOG_PROJECT_ID) {
  console.error('Error: POSTHOG_PROJECT_ID not found in .env');
  process.exit(1);
}

const query = process.argv[2];
if (!query) {
  console.error('Usage: npx tsx scripts/query-posthog.ts "<SQL_QUERY>"');
  console.error('Example: npx tsx scripts/query-posthog.ts "SELECT event, COUNT() FROM events WHERE timestamp >= now() - INTERVAL 1 DAY GROUP BY event ORDER BY COUNT() DESC LIMIT 10"');
  process.exit(1);
}

async function queryPostHog(hogqlQuery: string, name = 'cli-query') {
  const url = `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${POSTHOG_API_KEY}`,
    },
    body: JSON.stringify({
      query: {
        kind: 'HogQLQuery',
        query: hogqlQuery,
      },
      name,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PostHog API error (${response.status}): ${text}`);
  }

  return response.json();
}

async function main() {
  console.log('Querying PostHog...');
  console.log('Query:', query);
  console.log('');

  try {
    const result = await queryPostHog(query);
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
