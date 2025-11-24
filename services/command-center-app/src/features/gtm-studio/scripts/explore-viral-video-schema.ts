#!/usr/bin/env node
import * as path from 'path'
import * as fs from 'fs'
import {
  exploreViralVideoSchema,
  generateExplorationReport,
  testWorkflowQueries,
} from '../services/viral-video-schema-explorer'

async function main() {
  console.log('🚀 Starting Viral Video Database Schema Exploration...\n')

  try {
    // Explore the schema
    console.log('📊 Exploring database schema...')
    const exploration = await exploreViralVideoSchema()

    // Generate report
    const report = generateExplorationReport(exploration)

    // Test workflow queries
    console.log('\n🧪 Testing workflow-specific queries...')
    const queryResults = await testWorkflowQueries()

    // Append query results to report
    let fullReport = report + '\n\n## Query Test Results\n\n```json\n'
    fullReport += JSON.stringify(queryResults, null, 2)
    fullReport += '\n```\n'

    // Save report to file
    const reportPath = path.join(
      process.cwd(),
      `viral-video-schema-report-${new Date().toISOString().split('T')[0]}.md`
    )
    fs.writeFileSync(reportPath, fullReport)

    console.log(`\n✅ Schema exploration complete!`)
    console.log(`📄 Report saved to: ${reportPath}`)

    // Print summary
    console.log('\n📋 Summary:')
    console.log(`- Tables found: ${exploration.tables.length}`)
    console.log(
      `- Workflow-related tables: ${exploration.potentialWorkflowTables.length}`
    )
    console.log(
      `- Potential foreign keys: ${exploration.potentialForeignKeys.length}`
    )

    if (exploration.potentialWorkflowTables.length > 0) {
      console.log('\n🔧 Workflow-related tables:')
      exploration.potentialWorkflowTables.forEach((table: string) => {
        console.log(`  - ${table}`)
      })
    }
  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

// Run if this is the main module
if (require.main === module) {
  main()
}
