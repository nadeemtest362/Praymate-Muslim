import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_VIRAL_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_VIRAL_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🚀 Starting GTM workflows table migration...');
    console.log(`📍 Database URL: ${supabaseUrl}`);
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'enhance_gtm_workflows_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('📄 Migration SQL loaded successfully');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    // Since we can't execute raw SQL directly through the JS client,
    // let's use the Supabase MCP tool to run the migration
    console.log('⚠️  The Supabase JavaScript client doesn\'t support raw SQL execution.');
    console.log('📋 Using Supabase MCP tool to execute the migration...\n');
    
    // First, let's check the current state
    console.log('🔍 Checking current gtm_workflows table structure...');
    
    const { data: workflows, error: workflowsError } = await supabase
      .from('gtm_workflows')
      .select('*')
      .limit(1);
    
    if (!workflowsError) {
      console.log('✅ gtm_workflows table exists and is accessible');
      if (workflows && workflows.length > 0) {
        const columns = Object.keys(workflows[0]);
        console.log('📊 Current columns:', columns.join(', '));
        
        // Check if new columns already exist
        const newColumns = ['description', 'category', 'is_template', 'run_count', 'last_run'];
        const existingNewColumns = newColumns.filter(col => columns.includes(col));
        
        if (existingNewColumns.length === newColumns.length) {
          console.log('✅ All enhanced columns already exist!');
          console.log('🎉 The migration may have already been applied.');
        } else if (existingNewColumns.length > 0) {
          console.log('✅ Some enhanced columns already exist:', existingNewColumns.join(', '));
          const missingColumns = newColumns.filter(col => !columns.includes(col));
          console.log('⚠️  Missing columns that need to be added:', missingColumns.join(', '));
        } else {
          console.log('⚠️  None of the new columns exist yet. Full migration needed.');
        }
      }
    } else {
      console.log('❌ Error accessing gtm_workflows table:', workflowsError.message);
    }
    
    // Check if workflow_runs table exists
    const { error: runsError } = await supabase
      .from('gtm_workflow_runs')
      .select('id')
      .limit(1);
    
    if (!runsError) {
      console.log('✅ gtm_workflow_runs table already exists');
    } else if (runsError.message.includes('does not exist')) {
      console.log('⚠️  gtm_workflow_runs table does not exist yet');
    }
    
    console.log('\n📄 Migration SQL file location:', migrationPath);
    console.log('\n🔧 To apply the migration, I\'ll use the Supabase MCP tool...');
    
    return { migrationSQL, statements };
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().then((result) => {
  console.log('\n✅ Migration check completed');
  console.log('\n📝 Migration SQL loaded and ready for execution');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});