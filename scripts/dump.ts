import { assess } from '../src/rules/engine';
import { PERSONAS } from '../src/personas';

for (const p of PERSONAS) {
  const r = assess(p.answers);
  console.log('\n' + '═'.repeat(70));
  console.log(p.name);
  console.log('═'.repeat(70));
  console.log('AMI:', Math.round(r.income.assessedMonthlyIncome), '| confidence:', r.confidence);
  console.log('Product:', r.productLabel, ' - ', r.routingWhy);
  console.log('Obligations:', Math.round(r.obligations.total), r.obligations.breakdown);
  console.log('\nO1 VERDICT:', r.verdict.call.toUpperCase());
  console.log('  ', r.verdict.headline);
  console.log('   why:', r.verdict.why);
  if (r.verdict.constructivePath) r.verdict.constructivePath.forEach((s) => console.log('   →', s));
  console.log('\nO2 MAX AMOUNT');
  console.log('   lender will sanction:', r.maxAmount.lenderWillSanction);
  console.log('   borrower can carry  :', r.maxAmount.borrowerCanCarry);
  console.log('   use:', r.maxAmount.useThis, '| amount:', r.maxAmount.amount);
  console.log('   why:', r.maxAmount.why);
  console.log('\nO3 RATE');
  console.log('   nominal:', r.rate.nominalBand, '| APR:', r.rate.aprBand);
  r.rate.notes.forEach((n) => console.log('   -', n));
  console.log('\nO4 OUTFLOW');
  console.log('   EMI ceiling:', r.outflow.emiCeiling);
  console.log('   at recommended', r.outflow.atRecommendedAmount.amount, ':');
  console.log('     prudent:', r.outflow.atRecommendedAmount.prudent);
  console.log('     maximum:', r.outflow.atRecommendedAmount.maximum);
  r.outflow.stress.forEach((s) => console.log(`   stress [${s.outcome}] ${s.label}: FOIR ${Math.round(s.foir * 100)}% - ${s.detail}`));
  console.log('   why:', r.outflow.why);
  console.log('\nNEGOTIATION CARD');
  console.log('  ', JSON.stringify(r.card, null, 2).replace(/\n/g, '\n   '));
  console.log('\nMISSING (would tighten):');
  r.missingAnswers.forEach((m) => console.log('   -', m.field, '→', m.wouldDo));
  console.log('ASSUMPTIONS USED:');
  r.assumptionsUsed.forEach((s) => console.log('   -', s));
}
