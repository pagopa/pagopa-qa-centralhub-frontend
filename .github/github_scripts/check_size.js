module.exports = async ({github, context, core}) => {
    const additions = context.payload.pull_request.additions || 0
    const deletions = context.payload.pull_request.deletions || 0
    let changes = additions + deletions;
    console.log('additions: ' + additions + ' + deletions: ' + deletions + ' = total changes: ' + changes);

    const {IGNORED_FILES = '', BRANCH_NAME = ''} = process.env
    const ignored_files = IGNORED_FILES.trim().split(',').map(word => word.trim()).filter(word => word.length > 0);
    if (ignored_files.length > 0) {
        if (!/^[A-Za-z0-9._/-]+$/.test(BRANCH_NAME)) {
            throw new Error('Invalid BRANCH_NAME format');
        }

        var ignored = 0
        const execFileSync = require('child_process').execFileSync;
        const diffOutput = execFileSync(
            'git',
            ['--no-pager', 'diff', '--numstat', 'origin/main..origin/' + BRANCH_NAME],
            {encoding: 'utf-8'}
        );
        const diffLines = diffOutput.split('\n').filter(line => line.trim().length > 0);

        for (const file of ignored_files) {
            const matchingLines = diffLines.filter(line => line.includes(file));
            const ignored_additions = matchingLines
                .map(line => parseInt((line.split('\t')[0] || '0'), 10))
                .filter(value => !Number.isNaN(value))
                .reduce((accumulator, currentValue) => accumulator + currentValue, 0);
            const ignored_deletions = matchingLines
                .map(line => parseInt((line.split('\t')[1] || '0'), 10))
                .filter(value => !Number.isNaN(value))
                .reduce((accumulator, currentValue) => accumulator + currentValue, 0);

            ignored += ignored_additions + ignored_deletions;
        }
        changes -= ignored
        console.log('ignored lines: ' + ignored + ' , consider changes: ' + changes);
    }

    var labels = await github.rest.issues.listLabelsOnIssue({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo
    });

    if (changes <= 400) {
        if (labels.data.find(label => label.name === 'size/large')) {
            github.rest.issues.removeLabel({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                name: 'size/large'
            })
        }
    }

    if (changes >= 200) {
        if (labels.data.find(label => label.name === 'size/small')) {
            github.rest.issues.removeLabel({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                name: 'size/small'
            })
        }
    }

    var comments = await github.rest.issues.listComments({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo
    });
    for (const comment of comments.data) {
        if (comment.body.includes('This PR exceeds the recommended size')) {
            github.rest.issues.deleteComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                comment_id: comment.id
            })
        }
    }

    if (changes < 200) {
        github.rest.issues.addLabels({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            labels: ['size/small']
        })
    }

    if (changes > 400) {
        github.rest.issues.addLabels({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            labels: ['size/large']
        })

        github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: 'This PR exceeds the recommended size of 400 lines. Please make sure you are NOT addressing multiple issues with one PR. _Note this PR might be rejected due to its size._'
        })

    }
}