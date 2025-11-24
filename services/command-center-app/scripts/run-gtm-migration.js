const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.VITE_VIRAL_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_VIRAL_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials. Please check your .env.local file');
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
    
    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      const preview = statement.substring(0, 80).replace(/\n/g, ' ');
      console.log(`🔸 Statement ${i + 1}/${statements.length}: ${preview}${statement.length > 80 ? '...' : ''}`);
      
      try {
        // Use Supabase's query endpoint
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            query_text: statement
          })
        });
        
        if (!response.ok) {
          // This is expected - Supabase doesn't expose a direct SQL execution endpoint
          // We'll need to use the Supabase CLI or dashboard for this migration
          console.log('   ⚠️  Direct SQL execution not available via API');
        }
      } catch (err) {
        // Expected - continue
      }
    }
    
    console.log('\n⚠️  Direct SQL execution is not available through the Supabase JavaScript client.');
    console.log('\n📋 To run this migration, you have the following options:\n');
    console.log('1. Use the Supabase Dashboard:');
    console.log('   - Go to your project dashboard');
    console.log('   - Navigate to the SQL Editor');
    console.log('   - Copy and paste the migration SQL');
    console.log('   - Execute the query\n');
    console.log('2. Use the Supabase CLI:');
    console.log('   - Install: npm install -g supabase');
    console.log('   - Link your project: supabase link --project-ref kfrvxoxdehduqrpcbibl');
    console.log('   - Run: supabase db push\n');
    console.log('3. Create the migration using Supabase tools (recommended):');
    console.log('   - Copy the SQL file to your project\'s supabase/migrations folder');
    console.log('   - Use: supabase migration new enhance_gtm_workflows');
    console.log('   - Then: supabase db push\n');
    
    // Let's at least verify current table structure
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
        
        if (existingNewColumns.length > 0) {
          console.log('✅ Some enhanced columns already exist:', existingNewColumns.join(', '));
        }
        if (existingNewColumns.length < newColumns.length) {
          const missingColumns = newColumns.filter(col => !columns.includes(col));
          console.log('⚠️  Missing columns that need to be added:', missingColumns.join(', '));
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
    
    // Output the migration SQL for manual execution
    console.log('\n📄 Migration SQL saved at:', migrationPath);
    console.log('\nPlease execute the migration using one of the methods above.');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().then(() => {
  console.log('\n✅ Migration check completed');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});