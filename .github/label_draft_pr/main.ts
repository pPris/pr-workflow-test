import core from "@actions/core";
import github from "@actions/github";
import { log } from "../common";

const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);

// params to set
// check https://github.com/actions/toolkit/blob/main/packages/github/src/context.ts to figure out what's being responded
const owner = github.context.repo.owner; 
const repo = github.context.repo.repo;
const issue_number = github.context.issue.number;

// todo old files needs to be standardized with new ones
// todo should core.getInput and getOctokit(token) be enclosed in try catch blocks
async function run() {
    try {
        log.info(github.context.eventName, "event name");

        const isDraftPr = await getPrDraftProperty();

        if (!isDraftPr) {
            core.info("not a draft pr, ending.")
            return;
        }

        // todo
        const label = await octokit.rest.issues.addLabels({
            owner: owner,
            repo: repo,
            issue_number: issue_number,
            labels: ["s.Ongoing"]
        })    
        .then(res => log.info(res, "adding label..."))
        .catch(err => log.info(err, "error adding label"));

    } catch (ex) {
        core.info(ex);
        core.setFailed(ex.message);
    }
}

async function getPrDraftProperty() : Promise<boolean> {
    return await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: issue_number,
    })
    .then(res => {
        log.info(res, "pr details...");
        log.warn(res.data.draft, "is draft")
        return res.data.draft;
    })
    .catch(err => log.info(err, "error getting pr (issue) that triggered this workflow"));
}

run();