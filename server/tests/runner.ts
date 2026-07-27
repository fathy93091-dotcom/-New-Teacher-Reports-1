import { runDitaUnitTests } from "../unitTests";

async function main() {
  console.log("==========================================");
  console.log(" Daily Islamic Teacher Assistant (DITA)");
  console.log(" Comprehensive Unit Test Runner");
  console.log("==========================================\n");

  const summary = await runDitaUnitTests();

  summary.results.forEach((test, idx) => {
    const status = test.passed ? "✅ [PASS]" : "❌ [FAIL]";
    console.log(`${idx + 1}. ${status} [${test.module}] ${test.name} (${test.durationMs}ms)`);
    console.log(`   Message: ${test.message}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Actual:   ${test.actual}\n`);
  });

  console.log("==========================================");
  console.log(` Summary: ${summary.passedCount} Passed, ${summary.failedCount} Failed in ${summary.totalDurationMs}ms`);
  console.log("==========================================");

  if (summary.failedCount > 0) {
    process.exit(1);
  }
}

main();
