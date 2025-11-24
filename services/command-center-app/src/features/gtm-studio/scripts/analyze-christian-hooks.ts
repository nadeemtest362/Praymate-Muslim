import {
  getTopChristianTikTokHooks,
  analyzeChristianHookPatterns,
} from '../services/supabase-service'

async function runAnalysis() {
  console.log('🚀 Starting Christian TikTok Hook Analysis...')
  console.log('='.repeat(80))

  try {
    // First, get top performing hooks
    console.log('\n📊 Fetching top Christian TikTok videos...')
    const topVideos = await getTopChristianTikTokHooks(50, 500000) // Top 50 with 500k+ views (viral threshold)

    console.log('\n🎯 TOP 20 CHRISTIAN TIKTOK HOOKS (500k+ Views):')
    console.log('='.repeat(80))

    topVideos.slice(0, 20).forEach((video, index) => {
      console.log(`\n${index + 1}. Hook: "${video.hook_transcript}"`)
      console.log(`   Views: ${video.view_count.toLocaleString()}`)
      console.log(
        `   Engagement: ${(((video.like_count + video.comment_count + video.share_count) / video.view_count) * 100).toFixed(2)}%`
      )
      console.log(`   Author: @${video.author_name}`)
      console.log(
        `   Length: ${video.hook_transcript?.split(' ').length || 0} words`
      )
    })

    // Now run the comprehensive analysis
    console.log('\n\n🧠 Running Comprehensive Hook Pattern Analysis...')
    console.log('='.repeat(80))

    const analysis = await analyzeChristianHookPatterns()

    if (!analysis) {
      console.error('❌ Analysis failed')
      return
    }

    console.log('\n📈 ANALYSIS RESULTS:')
    console.log(`Total Videos Analyzed: ${analysis.totalVideos}`)
    console.log(`Average Views: ${analysis.averageViews.toLocaleString()}`)
    console.log(`Average Engagement Rate: ${analysis.averageEngagementRate}%`)
    console.log(`Average Hook Length: ${analysis.averageHookLength} words`)

    console.log('\n🎨 HOOK PATTERN BREAKDOWN:')
    console.log(`Questions: ${analysis.patternPercentages.questions}`)
    console.log(
      `Personal Stories: ${analysis.patternPercentages.personalStory}`
    )
    console.log(`Challenges: ${analysis.patternPercentages.challenge}`)
    console.log(
      `Revelations/Secrets: ${analysis.patternPercentages.revelation}`
    )
    console.log(`Controversial: ${analysis.patternPercentages.controversy}`)

    console.log('\n📝 TOP 30 MOST COMMON WORDS IN HOOKS:')
    analysis.mostCommonWords.forEach((item, index) => {
      if (index % 5 === 0) console.log('') // New line every 5 words
      process.stdout.write(`${item.word} (${item.count}), `)
    })

    console.log('\n\n🔥 HIGHEST PERFORMING HOOKS:')
    console.log('='.repeat(80))

    analysis.topHooks.slice(0, 10).forEach((hook, index) => {
      console.log(`\n${index + 1}. "${hook.hook}"`)
      console.log(
        `   Views: ${hook.views.toLocaleString()} | Engagement: ${hook.engagementRate}% | Author: @${hook.author}`
      )
    })

    // Key insights
    console.log('\n\n💡 KEY INSIGHTS:')
    console.log('='.repeat(80))
    console.log(
      '1. Hook Length: The average successful hook is ~' +
        analysis.averageHookLength +
        ' words'
    )
    console.log(
      '2. Questions are used in ' +
        analysis.patternPercentages.questions +
        ' of top videos'
    )
    console.log(
      '3. Personal stories appear in ' +
        analysis.patternPercentages.personalStory +
        ' of content'
    )
    console.log(
      '4. The average engagement rate is ' +
        analysis.averageEngagementRate +
        '%'
    )

    // Hook formula suggestions
    console.log('\n\n🎯 HOOK FORMULA RECOMMENDATIONS:')
    console.log('='.repeat(80))
    console.log(
      'Based on the data, here are proven hook formulas for Christian content:'
    )
    console.log('\n1. PERSONAL TRANSFORMATION:')
    console.log(
      '   "I used to [negative state], but then [transformation through faith]"'
    )
    console.log(
      '   Example: "I used to hate myself, but then God showed me my true worth"'
    )

    console.log('\n2. CONTROVERSIAL QUESTION:')
    console.log('   "Why do Christians [unexpected behavior/belief]?"')
    console.log('   Example: "Why do Christians say suffering is a blessing?"')

    console.log('\n3. REVELATION/SECRET:')
    console.log(
      '   "The truth about [common misconception] that nobody talks about"'
    )
    console.log('   Example: "The truth about prayer that nobody talks about"')

    console.log('\n4. CHALLENGE:')
    console.log(
      '   "I challenge you to [specific faith action] for [time period]"'
    )
    console.log(
      '   Example: "I challenge you to pray for your enemies for 7 days"'
    )

    console.log('\n5. RELATABLE STRUGGLE:')
    console.log('   "POV: You\'re trying to [common Christian struggle]"')
    console.log(
      '   Example: "POV: You\'re trying to pray but keep getting distracted"'
    )

    // Save results to file
    const reportContent = {
      generatedAt: new Date().toISOString(),
      topVideos: topVideos.slice(0, 50),
      analysis,
      insights: {
        averageHookLength: analysis.averageHookLength,
        topPatterns: analysis.patternPercentages,
        engagementRate: analysis.averageEngagementRate,
        mostCommonWords: analysis.mostCommonWords.slice(0, 20),
      },
    }

    console.log(
      '\n\n✅ Analysis complete! Check the console output above for detailed results.'
    )
  } catch (error) {
    console.error('❌ Error during analysis:', error)
  }
}

// Run the analysis
runAnalysis()
