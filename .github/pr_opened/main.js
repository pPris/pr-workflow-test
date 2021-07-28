const core = require("@actions/core");
const github = require("@actions/github");

async function run() {
    try {
        const token = core.getInput("repo-token");
        const octokit = github.getOctokit(token);

        core.info("Octokit has been set up");

        // params to set
        const _owner = github.context.owner;
        const _repo = github.context.repo;
        const _actor = github.context.actor;
        const commentBody = `Hi ${_actor}, Thank you for contributing. Please comment \`@bot ready for review\` when you're ready to request a review.`
        core.info(github.context.issue);

        const _issue_num = github.context.issue.number;
        console.log(github.context.issue);
        console.log(_issue_num);

        const comment = await octokit.rest.issues.createComment({
            owner: _owner,
            repo: _repo,
            body: commentBody,
            issue_number: _issue_num
        })

        core.info("Commented: " + commentBody);

        const label = await octokit.rest.issues.addLabels({
            owner: _owner,
            repo: _repo,
            body: commentBody,
            issue_number: _issue_num,
            labels: {name: "S.Ongoing"}
        })

        core.info("label has been added");

    } catch (ex) {
        core.info(ex);
        core.setFailed(ex.message);
    }
}

run();