import { visibleQuestions, incomeFieldLabel } from '../src/questions/schema';
import { PERSONAS } from '../src/personas';

for (const p of PERSONAS) {
  console.log('\n### ' + p.name);
  const vis = visibleQuestions(p.answers);
  for (const tier of ['must', 'additional'] as const) {
    console.log(`\n**${tier === 'must' ? 'Must' : 'Additional'} questions shown:**\n`);
    for (const q of vis.filter((x) => x.tier === tier)) {
      const label = q.id === 'netMonthlyIncome' ? incomeFieldLabel(p.answers) : q.label;
      const raw = (p.answers as Record<string, unknown>)[q.id as string];
      const ans = raw === undefined ? '_(skipped -> default)_' : `**${JSON.stringify(raw)}**`;
      console.log(`- ${label} -> ${ans}`);
    }
  }
  const hiddenAdd = visibleQuestions({}).filter(
    (x) => x.tier === 'additional' && !vis.some((v) => v.id === x.id),
  );
  // list additional questions NOT shown to this persona (adaptive skip)
  const allAdd = [
    'largeEmployer',
    'variablePayShareOfIncome',
    'incomeEvidence',
    'highCostDebtOutstanding',
    'loanIsProductive',
  ];
  const skipped = allAdd.filter((id) => !vis.some((v) => v.id === id));
  console.log(`\n_Adaptively hidden: ${skipped.join(', ') || 'none'}_`);
  void hiddenAdd;
}
