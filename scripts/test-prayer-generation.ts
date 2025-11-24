#!/usr/bin/env ts-node

/**
 * Prayer Generation System Integration Test Script
 * 
 * This script automates testing of the prayer generation system
 * to verify all components work together seamlessly.
 * 
 * Usage: ts-node scripts/test-prayer-generation.ts [environment]
 * Environment: local | staging | production (default: staging)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Configuration
const ENV = process.argv[2] || 'staging'
const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Test configuration
const TEST_USER_EMAIL = 'prayer-test@example.com'
const TEST_USER_PASSWORD = 'TestPassword123!'

// Initialize Supabase clients
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Test results tracking
interface TestResult {
  testId: string
  name: string
  status: 'PASS' | 'FAIL' | 'SKIP'
  error?: string
  duration?: number
  details?: any
}

const testResults: TestResult[] = []

// Utility functions
function log(message: string, data?: any) {
  console.log(`[${new Date().toISOString()}] ${message}`)
  if (data) {
    console.log(JSON.stringify(data, null, 2))
  }
}

function logError(message: string, error: any) {
  console.error(`[${new Date().toISOString()}] ERROR: ${message}`)
  console.error(error)
}

async function recordTestResult(result: TestResult) {
  testResults.push(result)
  const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️'
  log(`${status} ${result.testId}: ${result.name}`)
  if (result.error) {
    logError(`   Error: ${result.error}`, result.details)
  }
}

// Test helper functions
async function createTestUser(): Promise<string> {
  log('Creating test user...')
  
  // First, try to sign in (user might already exist)
  const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD
  })
  
  if (signInData?.user) {
    log('Test user already exists, using existing user')
    return signInData.user.id
  }
  
  // Create new user
  const { data, error } = await supabaseAnon.auth.signUp({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    options: {
      data: {
        display_name: 'Test User'
      }
    }
  })
  
  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`)
  }
  
  return data.user!.id
}

async function cleanupTestUser(userId: string) {
  log('Cleaning up test user data...')
  
  // Delete in order to respect foreign key constraints
  await supabaseService.from('prayers').delete().eq('user_id', userId)
  await supabaseService.from('prayer_intentions').delete().eq('user_id', userId)
  await supabaseService.from('prayer_focus_people').delete().eq('user_id', userId)
  
  // Reset profile
  await supabaseService
    .from('profiles')
    .update({ 
      last_openai_response_id: null,
      mood: null,
      mood_context: null
    })
    .eq('id', userId)
}

// Main test runner
async function runTests() {
  log(`Starting Prayer Generation System Integration Tests`)
  log(`Environment: ${ENV}`)
  log(`Supabase URL: ${SUPABASE_URL}`)
  log('----------------------------------------')
  
  let userId: string | undefined
  
  try {
    // Setup
    userId = await createTestUser()
    log(`Test user ID: ${userId}`)
    
    // Run a simple test
    const startTime = Date.now()
    
    // Call prayer generation endpoint
    const { data, error } = await supabaseAnon.functions.invoke('generate-prayer', {
      body: {
        slot: 'morning'
      }
    })
    
    const testResult: TestResult = {
      testId: 'E2E-BASIC',
      name: 'Basic Prayer Generation',
      status: error ? 'FAIL' : 'PASS',
      error: error?.message,
      duration: Date.now() - startTime,
      details: data || error
    }
    
    await recordTestResult(testResult)
    
  } catch (error: any) {
    logError('Test setup failed', error)
  } finally {
    // Cleanup
    if (userId) {
      await cleanupTestUser(userId)
    }
    
    // Print summary
    log('\n========================================')
    log('TEST SUMMARY')
    log('========================================')
    
    const passed = testResults.filter(r => r.status === 'PASS').length
    const failed = testResults.filter(r => r.status === 'FAIL').length
    const skipped = testResults.filter(r => r.status === 'SKIP').length
    const total = testResults.length
    
    log(`Total Tests: ${total}`)
    log(`Passed: ${passed} ✅`)
    log(`Failed: ${failed} ❌`)
    log(`Skipped: ${skipped} ⏭️`)
    
    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0)
  }
}

// Run tests
runTests().catch(error => {
  logError('Unhandled error', error)
  process.exit(1)
}) 