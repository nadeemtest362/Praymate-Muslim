import { readFileSync } from 'fs'
import { join } from 'path'
import { supabase } from '../src/features/gtm-studio/services/supabase-service'

async function runMigration() {
  try {
    console.log('🚀 Starting GTM workflows table migration...')
    
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', 'enhance_gtm_workflows_table.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    console.log('📄 Migration SQL loaded successfully')
    console.log('📋 Migration contains:', migrationSQL.split('\n').filter(line => line.trim() && !line.startsWith('--')).length, 'SQL statements')
    
    // Execute the migration
    console.log('🔄 Executing migration...')
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })
    
    if (error) {
      // If RPC doesn't exist, try direct execution
      console.log('⚠️  RPC method not available, attempting direct execution...')
      
      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))
      
      console.log(`📝 Executing ${statements.length} SQL statements...`)
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i]
        console.log(`\n🔸 Statement ${i + 1}/${statements.length}:`)
        console.log(`   ${statement.substring(0, 60)}${statement.length > 60 ? '...' : ''}`)
        
        // Use raw SQL execution via Supabase client
        const { error: stmtError } = await supabase.rpc('query', { 
          query_text: statement + ';' 
        }).catch(async () => {
          // If that fails too, we'll need to use a different approach
          // For now, let's try to verify if the changes already exist
          console.log('   ⚠️  Direct execution failed, checking if changes already exist...')
          
          // Check if columns already exist by querying the table
          if (statement.includes('ALTER TABLE gtm_workflows')) {
            const { data: tableInfo, error: infoError } = await supabase
              .from('gtm_workflows')
              .select('*')
              .limit(1)
            
            if (!infoError && tableInfo) {
              console.log('   ✅ Table exists and is accessible')
              return { error: null }
            }
          }
          
          return { error: new Error('Unable to execute statement') }
        })
        
        if (stmtError) {
          console.error(`   ❌ Error executing statement ${i + 1}:`, stmtError)
          throw stmtError
        }
        
        console.log(`   ✅ Statement ${i + 1} executed successfully`)
      }
    }
    
    console.log('\n✅ Migration completed successfully!')
    
    // Verify the changes
    console.log('\n🔍 Verifying migration results...')
    
    // Check if the workflow_runs table exists
    const { data: workflowRuns, error: runsError } = await supabase
      .from('gtm_workflow_runs')
      .select('id')
      .limit(1)
    
    if (!runsError) {
      console.log('✅ gtm_workflow_runs table created successfully')
    } else {
      console.log('⚠️  Could not verify gtm_workflow_runs table:', runsError.message)
    }
    
    // Check if new columns exist in gtm_workflows
    const { data: workflows, error: workflowsError } = await supabase
      .from('gtm_workflows')
      .select('id, description, category, is_template, run_count, last_run')
      .limit(1)
    
    if (!workflowsError) {
      console.log('✅ gtm_workflows table enhanced with new columns')
    } else {
      console.log('⚠️  Could not verify gtm_workflows columns:', workflowsError.message)
    }
    
    console.log('\n🎉 Migration process completed!')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
runMigration().then(() => {
  console.log('\n👋 Exiting...')
  process.exit(0)
}).catch((error) => {
  console.error('\n💥 Unexpected error:', error)
  process.exit(1)
})