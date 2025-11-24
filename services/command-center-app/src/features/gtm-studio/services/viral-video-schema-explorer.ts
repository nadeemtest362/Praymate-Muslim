import { createClient } from '@supabase/supabase-js'

// Viral Video Supabase configuration - using environment variables
const viralVideoSupabaseUrl =
  import.meta.env.VITE_VIRAL_SUPABASE_URL ||
  'https://molydcrzwsoeyqkiofwe.supabase.co'
const viralVideoSupabaseAnonKey =
  import.meta.env.VITE_VIRAL_SUPABASE_ANON_KEY || ''

if (!viralVideoSupabaseAnonKey) {
  throw new Error(
    'VITE_VIRAL_SUPABASE_ANON_KEY is not set. Please check your .env file.'
  )
}

export const viralVideoSupabase = createClient(
  viralVideoSupabaseUrl,
  viralVideoSupabaseAnonKey
)

interface TableColumn {
  column_name: string
  data_type: string
  is_nullable: boolean
  column_default: any
}

interface TableSchema {
  tableName: string
  columns: TableColumn[]
}

interface SchemaExploration {
  tables: string[]
  schemas: Record<string, TableSchema>
  potentialWorkflowTables: string[]
  potentialForeignKeys: Array<{
    table: string
    column: string
    referencedTable?: string
  }>
}

// Function to get list of tables by querying known tables
export async function exploreViralVideoSchema(): Promise<SchemaExploration> {
  const exploration: SchemaExploration = {
    tables: [],
    schemas: {},
    potentialWorkflowTables: [],
    potentialForeignKeys: [],
  }

  try {
    console.log('🔍 Exploring Viral Video database schema...')

    // List of common table names to check
    const commonTables = [
      'users',
      'profiles',
      'videos',
      'campaigns',
      'workflows',
      'workflow_steps',
      'workflow_runs',
      'tasks',
      'jobs',
      'content',
      'media',
      'analytics',
      'metrics',
      'performance',
      'creators',
      'brands',
      'projects',
      'assets',
      'templates',
      'automations',
      'processes',
      'stages',
      'pipeline',
      'viral_campaigns',
      'viral_videos',
      'viral_metrics',
      'viral_analytics',
    ]

    // Try to query each table to see if it exists
    for (const tableName of commonTables) {
      try {
        const { data, error } = await viralVideoSupabase
          .from(tableName)
          .select('*')
          .limit(0) // Just check if table exists

        if (!error) {
          exploration.tables.push(tableName)
          console.log(`✅ Found table: ${tableName}`)
        }
      } catch (e) {
        // Table doesn't exist, continue
      }
    }

    // For each found table, try to get a sample row to understand schema
    for (const tableName of exploration.tables) {
      try {
        const { data, error } = await viralVideoSupabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (!error && data && data.length > 0) {
          const sample = data[0]
          const columns: TableColumn[] = Object.keys(sample).map((key) => ({
            column_name: key,
            data_type: typeof sample[key],
            is_nullable: sample[key] === null,
            column_default: null,
          }))

          exploration.schemas[tableName] = {
            tableName,
            columns,
          }

          // Check for potential foreign keys (columns ending with _id)
          columns.forEach((col) => {
            if (col.column_name.endsWith('_id') && col.column_name !== 'id') {
              const potentialTable = col.column_name.replace('_id', '')
              exploration.potentialForeignKeys.push({
                table: tableName,
                column: col.column_name,
                referencedTable: exploration.tables.includes(potentialTable)
                  ? potentialTable
                  : undefined,
              })
            }
          })
        }
      } catch (e) {
        console.error(`Error exploring table ${tableName}:`, e)
      }
    }

    // Identify workflow-related tables
    const workflowKeywords = [
      'workflow',
      'flow',
      'process',
      'step',
      'stage',
      'pipeline',
      'automation',
      'task',
      'job',
    ]
    exploration.potentialWorkflowTables = exploration.tables.filter((table) =>
      workflowKeywords.some((keyword) => table.toLowerCase().includes(keyword))
    )

    return exploration
  } catch (error) {
    console.error('❌ Error exploring schema:', error)
    throw error
  }
}

// Function to generate a report from the exploration
export function generateExplorationReport(
  exploration: SchemaExploration
): string {
  let report = `# Viral Video Database Schema Exploration\n\n`
  report += `Generated: ${new Date().toISOString()}\n\n`

  // Summary
  report += `## Summary\n\n`
  report += `- Tables found: ${exploration.tables.length}\n`
  report += `- Potential workflow-related tables: ${exploration.potentialWorkflowTables.length}\n`
  report += `- Potential foreign key relationships: ${exploration.potentialForeignKeys.length}\n\n`

  // Tables Found
  report += `## Tables Found\n\n`
  exploration.tables.forEach((table) => {
    report += `- ${table}\n`
  })
  report += `\n`

  // Workflow-Related Tables
  report += `## Workflow-Related Tables\n\n`
  if (exploration.potentialWorkflowTables.length > 0) {
    exploration.potentialWorkflowTables.forEach((table) => {
      report += `- **${table}**\n`
    })
  } else {
    report += `No workflow-related tables identified.\n`
  }
  report += `\n`

  // Potential Foreign Keys
  report += `## Potential Foreign Key Relationships\n\n`
  if (exploration.potentialForeignKeys.length > 0) {
    report += `| Table | Column | Likely References |\n`
    report += `|-------|--------|------------------|\n`
    exploration.potentialForeignKeys.forEach((fk) => {
      report += `| ${fk.table} | ${fk.column} | ${fk.referencedTable || 'Unknown'} |\n`
    })
  } else {
    report += `No potential foreign keys identified.\n`
  }
  report += `\n`

  // Table Schemas
  report += `## Table Schemas\n\n`
  Object.entries(exploration.schemas).forEach(([tableName, schema]) => {
    report += `### ${tableName}\n\n`
    report += `| Column | Type | Nullable |\n`
    report += `|--------|------|----------|\n`
    schema.columns.forEach((col) => {
      report += `| ${col.column_name} | ${col.data_type} | ${col.is_nullable ? 'Yes' : 'No'} |\n`
    })
    report += `\n`
  })

  // Recommendations for Workflows Table
  report += `## Recommendations for Workflows Table Integration\n\n`
  report += `Based on the schema exploration, here are recommendations for the workflows table:\n\n`

  if (exploration.potentialWorkflowTables.length > 0) {
    report += `### Existing Workflow Tables\n`
    report += `The following existing tables might need to be considered:\n`
    exploration.potentialWorkflowTables.forEach((table) => {
      report += `- ${table}\n`
    })
    report += `\n`
  }

  report += `### Suggested Foreign Key Relationships\n\n`

  // Check for user/creator tables
  const userTables = exploration.tables.filter((t) =>
    ['users', 'profiles', 'creators', 'accounts'].includes(t.toLowerCase())
  )
  if (userTables.length > 0) {
    report += `1. **User/Creator relationship**: workflows.created_by -> ${userTables[0]}.id\n`
  }

  // Check for campaign/project tables
  const projectTables = exploration.tables.filter((t) =>
    ['campaigns', 'projects', 'brands'].includes(t.toLowerCase())
  )
  if (projectTables.length > 0) {
    report += `2. **Campaign/Project relationship**: workflows.campaign_id -> ${projectTables[0]}.id\n`
  }

  // Check for video/content tables
  const contentTables = exploration.tables.filter((t) =>
    ['videos', 'content', 'media', 'assets'].includes(t.toLowerCase())
  )
  if (contentTables.length > 0) {
    report += `3. **Content relationship**: workflow_outputs.video_id -> ${contentTables[0]}.id\n`
  }

  report += `\n### Additional Considerations\n\n`
  report += `- Ensure proper indexing on foreign key columns\n`
  report += `- Consider adding RLS policies if the database uses Row Level Security\n`
  report += `- Add appropriate triggers for updated_at timestamps\n`
  report += `- Consider cascade delete options for related records\n`

  return report
}

// Function to test specific queries
export async function testWorkflowQueries() {
  const results: Record<string, any> = {}

  // Test if workflows table exists
  try {
    const { data, error } = await viralVideoSupabase
      .from('workflows')
      .select('*')
      .limit(1)

    results.workflowsTableExists = !error
    results.workflowsSample = data?.[0] || null
  } catch (e) {
    results.workflowsTableExists = false
  }

  // Test if workflow_steps exists
  try {
    const { data, error } = await viralVideoSupabase
      .from('workflow_steps')
      .select('*')
      .limit(1)

    results.workflowStepsTableExists = !error
    results.workflowStepsSample = data?.[0] || null
  } catch (e) {
    results.workflowStepsTableExists = false
  }

  // Test if campaigns exists
  try {
    const { data, error } = await viralVideoSupabase
      .from('campaigns')
      .select('*')
      .limit(1)

    results.campaignsTableExists = !error
    results.campaignsSample = data?.[0] || null
  } catch (e) {
    results.campaignsTableExists = false
  }

  return results
}
