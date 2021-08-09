const core = require("@actions/core");
const github = require("@actions/github");
const { log } = require("../../lib/.github/common")

// todo old files needs to be standardized with new ones
// todo should core.getInput and getOctokit(token) be enclosed in try catch blocks
async function run() {
    try {
        const token = core.getInput("repo-token");
        const octokit = github.getOctokit(token);

        core.info("Octokit has been set up");

        // params to set
        // check https://github.com/actions/toolkit/blob/main/packages/github/src/context.ts to figure out what's being responded
        const owner = github.context.repo.owner; 
        const repo = github.context.repo.repo;
        const issue_number = github.context.issue.number;

        const isDraftPr = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: issue_number,
        })
        .then(res => {
            log.info(res, "pr details...");
            log.warn(res.data.draft, "is draft")
            return res.data.draft;
        })
        .catch(err => log.info(err, "error adding label"));

        // todo
        const label = await octokit.rest.issues.addLabels({
            owner: owner,
            repo: repo,
            issue_number: issue_number,
            labels: ["s.Ongoing"]
        })    
        .then(res => log.info(res, "adding label..."))
        .catch(err => log.info(err, "error adding label"));

        core.info("label has been added");

    } catch (ex) {
        core.info(ex);
        core.setFailed(ex.message);
    }
}

run();