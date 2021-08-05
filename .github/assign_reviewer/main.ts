import core = require("@actions/core");
import github = require("@actions/github");
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);

const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
const actor = github.context.actor;
const issueNum = github.context.issue.number;
const ref = github.context.ref;

async function run() {
    try {
        await getOpenPRs();
    } catch (ex) {
        core.info(ex);
        core.setFailed(ex.message);
    }
}

async function getOpenPRs() {
    await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: "open",
        labels: "s.Ongoing",
        assignee: "none"
    })
    .then(res => core.info(JSON.stringify(res)))
    .catch(err => { core.info(err); throw err })
}

run();