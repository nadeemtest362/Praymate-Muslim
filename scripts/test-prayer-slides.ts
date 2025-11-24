#!/usr/bin/env ts-node
/**
 * Prayer Slide Count Testing Script
 * 
 * This script demonstrates how to calculate slide counts for prayers
 * without running the full mobile app. Use this as a template for
 * building your own testing tools.
 * 
 * Usage:
 *   ts-node scripts/test-prayer-slides.ts
 * 
 * Or add to package.json:
 *   "test:prayer-slides": "ts-node scripts/test-prayer-slides.ts"
 */

/// <reference types="node" />

// ============================================================================
// CORE PARSING FUNCTIONS (from prayer-display logic)
// ============================================================================
// NOTE: In production, verses are NOT extracted or shown as separate slides.
// The prayer generation prompt instructs OpenAI to reference verse themes
// naturally within the prayer text, avoiding extractable citations.

interface SlideCalculationResult {
  totalSlides: number;
  introSlides: number;
  prayerSlides: number;
  finalSlides: number;
  paragraphs: string[];
  wordCount: number;
  avgWordsPerParagraph: number;
}

function calculateSlides(prayer: string): SlideCalculationResult {
  // Split into paragraphs
  const paragraphs = prayer
    .split('\n\n')
    .filter(p => p.trim().length > 10);
  
  // Count slides
  const introSlides = 1;
  const prayerSlides = paragraphs.length;
  const finalSlides = 1;
  const totalSlides = introSlides + prayerSlides + finalSlides;
  
  // Calculate metrics
  const wordCount = prayer.split(/\s+/).filter(w => w.length > 0).length;
  const avgWordsPerParagraph = prayerSlides > 0 
    ? Math.round(wordCount / prayerSlides) 
    : 0;
  
  return {
    totalSlides,
    introSlides,
    prayerSlides,
    finalSlides,
    paragraphs,
    wordCount,
    avgWordsPerParagraph
  };
}

// ============================================================================
// TEST CASES
// ============================================================================

interface TestCase {
  name: string;
  prayer: string;
  expectedSlides?: number;
}

const testCases: TestCase[] = [
  {
    name: "Simple three-paragraph prayer",
    prayer: `Heavenly Father, thank you for this day. Your grace sustains me and gives me strength.

Guide me in my work and relationships. Help me to show patience and understanding in difficult situations.

Help me to be patient and kind, reflecting Your love to everyone I meet. Amen.`,
    expectedSlides: 5
  },
  {
    name: "Long five-paragraph prayer",
    prayer: `Dear Lord, I come before you today grateful for your love and faithfulness. You are my rock and my refuge.

I pray for my family - keep them safe and healthy. Protect them in all they do and surround them with Your peace.

Grant me wisdom in my decisions at work. Help me to lead with integrity and compassion.

Help me to trust in your plan, even when I don't understand the path ahead.

May I reflect your love in all I do. Guide my words and actions throughout this day. Amen.`,
    expectedSlides: 7
  },
  {
    name: "Single paragraph prayer",
    prayer: "Lord, be with me today. Guide my steps and my words. Fill me with your peace and wisdom. Amen.",
    expectedSlides: 3
  },
  {
    name: "Prayer with very short paragraph (should be filtered)",
    prayer: `Dear God, thank you for your presence and guidance.

Hi.

I ask for your wisdom and strength today as I face challenges.`,
    expectedSlides: 4 // Should filter out "Hi." and count only 2 prayer slides
  },
  {
    name: "Realistic morning prayer with multiple people",
    prayer: `Heavenly Father, as I begin this day, I lift up John and Sarah to you. Watch over them and guide their steps according to your perfect will.

Lord, I'm grateful for the blessings in my life - for my health, for the Chapel community, and for your constant presence. Thank you for another morning to serve you and grow in faith.

I ask for your wisdom today in my work decisions. Help me to reflect your love in every interaction and to trust in your perfect plan for my life. Amen.`,
    expectedSlides: 5
  }
];

// ============================================================================
// TEST RUNNER
// ============================================================================

function runTests() {
  console.log('🙏 Prayer Slide Count Testing\n');
  console.log('=' .repeat(80));
  
  let passedTests = 0;
  let failedTests = 0;
  
  testCases.forEach((testCase, index) => {
    console.log(`\n📝 Test ${index + 1}: ${testCase.name}`);
    console.log('-'.repeat(80));
    
    const result = calculateSlides(testCase.prayer);
    
    // Display results
    console.log(`\n📊 Results:`);
    console.log(`   Total Slides: ${result.totalSlides}`);
    console.log(`   - Intro: ${result.introSlides}`);
    console.log(`   - Prayer: ${result.prayerSlides}`);
    console.log(`   - Final: ${result.finalSlides}`);
    console.log(`\n   Word Count: ${result.wordCount}`);
    console.log(`   Avg Words/Paragraph: ${result.avgWordsPerParagraph}`);
    
    // Show paragraphs
    console.log(`\n   Paragraphs (${result.paragraphs.length}):`);
    result.paragraphs.forEach((p, i) => {
      const preview = p.substring(0, 60) + (p.length > 60 ? '...' : '');
      console.log(`     ${i + 1}. ${preview}`);
    });
    
    // Check expectation
    if (testCase.expectedSlides !== undefined) {
      const passed = result.totalSlides === testCase.expectedSlides;
      if (passed) {
        console.log(`\n✅ PASSED - Got expected ${testCase.expectedSlides} slides`);
        passedTests++;
      } else {
        console.log(`\n❌ FAILED - Expected ${testCase.expectedSlides} slides, got ${result.totalSlides}`);
        failedTests++;
      }
    } else {
      console.log(`\n✓ Completed (no expectation set)`);
    }
  });
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log(`\n📈 Test Summary:`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${failedTests}`);
  console.log(`   Total: ${testCases.length}\n`);
  
  if (failedTests > 0) {
    process.exit(1);
  }
}

// ============================================================================
// HELPER: Interactive Testing
// ============================================================================

function testCustomPrayer(prayer: string) {
  console.log('\n🔍 Testing Custom Prayer\n');
  console.log('=' .repeat(80));
  console.log('\nPrayer Text:');
  console.log(prayer);
  console.log('\n' + '-'.repeat(80));
  
  const result = calculateSlides(prayer);
  
  console.log(`\n📊 Slide Breakdown:`);
  console.log(`   Total: ${result.totalSlides} slides`);
  console.log(`   Structure: Intro (1) + Prayer (${result.prayerSlides}) + Final (1)`);
  
  console.log(`\n📝 Content Metrics:`);
  console.log(`   Paragraphs: ${result.prayerSlides}`);
  console.log(`   Total Words: ${result.wordCount}`);
  console.log(`   Avg Words/Paragraph: ${result.avgWordsPerParagraph}`);
  
  console.log('\n💡 Recommendations:');
  if (result.totalSlides < 3) {
    console.log('   ⚠️  Prayer is very short (< 3 slides). Consider adding more paragraphs.');
  } else if (result.totalSlides > 9) {
    console.log('   ⚠️  Prayer is quite long (> 9 slides). Consider condensing.');
  } else {
    console.log('   ✅ Prayer length is good (3-9 slides).');
  }
  
  if (result.avgWordsPerParagraph < 20) {
    console.log('   ⚠️  Paragraphs are short. Consider more detail.');
  } else if (result.avgWordsPerParagraph > 60) {
    console.log('   ⚠️  Paragraphs are long. Consider breaking them up.');
  } else {
    console.log('   ✅ Paragraph length is good (20-60 words).');
  }
  
  console.log('\n');
}

// ============================================================================
// MAIN
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Test custom prayer from command line
    const prayerText = args.join(' ');
    testCustomPrayer(prayerText);
  } else {
    // Run test suite
    runTests();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export for use in other scripts
export { calculateSlides };
