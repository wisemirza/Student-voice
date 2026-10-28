require('dotenv').config();
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Firestore Live Verification - verify persistence, voting deduplication and admin endpoints', async () => {
  if (!process.env.FIREBASE_PROJECT_ID) {
    console.log('Skipping Firestore test: FIREBASE_PROJECT_ID not set');
    return;
  }

  // Load service account JSON as an environment variable to simulate Netlify production
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.resolve(__dirname, '..', 'service-account.json');

  if (!fs.existsSync(saPath)) {
    console.log('Skipping Firestore test: service account file not found');
    return;
  }

  const saContent = fs.readFileSync(saPath, 'utf8');
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = saContent;
  delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  const db = require('../src/db');
  const info = await db.initDb();
  assert.equal(info.engine, 'firestore', 'Database engine must be firestore');

  const voterHash1 = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const voterHash2 = 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';

  const testUnique = Date.now();

  // 1. Create issue
  const created = await db.createIssue({
    title: `Firestore Test ${testUnique}`,
    description: `Testing live Firestore persistence for Netlify deployment ${testUnique}.`,
    creatorTokenHash: voterHash1
  });

  assert(created && created.id, 'Created issue must have an ID');
  assert.equal(created.vote_count, 0);
  const issueId = created.id;

  try {
    // 2. Cast vote from voter 1
    const voteRes = await db.castVote({ issueId, voterTokenHash: voterHash1 });
    assert.equal(voteRes.voteCount, 1, 'Vote count should be 1 after voting');
    assert.equal(voteRes.alreadyVoted, false, 'First vote should have alreadyVoted: false');

    // 3. Try duplicate vote from voter 1 -> MUST return alreadyVoted: true and voteCount unchanged
    const duplicateRes = await db.castVote({ issueId, voterTokenHash: voterHash1 });
    assert.equal(duplicateRes.alreadyVoted, true, 'Duplicate vote must have alreadyVoted: true');
    assert.equal(duplicateRes.voteCount, 1, 'Vote count should remain 1 on duplicate vote');

    // 4. Cast vote from voter 2
    const voteRes2 = await db.castVote({ issueId, voterTokenHash: voterHash2 });
    assert.equal(voteRes2.voteCount, 2, 'Vote count should be 2 after second voter');

    // 5. Retract vote from voter 2
    const retractRes = await db.retractVote({ issueId, voterTokenHash: voterHash2 });
    assert.equal(retractRes.voteCount, 1, 'Vote count should return to 1 after retract');

    // 6. Submit a report
    const report = await db.createReport({
      issueId,
      reporterTokenHash: voterHash2,
      reason: 'off_topic',
      details: 'Automated test report'
    });
    assert.equal(report.reported, true, 'Report must be created successfully');

    // 7. Resolve reports for issue
    const resolveRes = await db.resolveReportsForIssue(issueId);
    assert.equal(resolveRes.resolved, true);

    // 8. Test listPublicIssues
    const publicIssues = await db.listPublicIssues({
      sort: 'popular',
      voterTokenHash: voterHash1
    });
    const found = publicIssues.find((i) => i.id === issueId);
    assert(found, 'Issue must be present in public issues list');
    assert.equal(found.has_voted, true, 'Voter 1 has_voted should be true');
    assert.equal(found.can_delete, true, 'Creator can_delete should be true within window');

    // 9. Clean up created test issue
    await db.deleteOwnIssue({ issueId, voterTokenHash: voterHash1 });

    const afterDelete = await db.getIssueById(issueId);
    assert.equal(afterDelete, null, 'Deleted issue should no longer be returned');
  } finally {
    await db.closeDb();
  }
});
