import core = require("@actions/core");
import github = require("@actions/github");
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);

const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
const actor = github.context.actor;
const issue_number = github.context.issue.number; // underscore to follow the api 
const ref = github.context.ref;

// topic : array of people who can be assigned 
const possibleAssignees = {
    any: ["ppris"]
}

async function run() {
    try {
        await getOpenPRs();
    } catch (ex) {
        core.info(ex);
        core.setFailed(ex.message);
    }
}

async function getOpenPRs() {
    const possiblePRsThatNeedAssignees = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: "open",
        labels: "s.ToReview",
        assignee: "none",
        sort: "updated", // in case operation times out, focus on doing the latest PRs that may not have been seen first
        direction: "desc"
    })
    .then(res => {core.info(JSON.stringify(res)); return res.data;}) // return the array of PRs
    .catch(err => { core.info(err); throw err })

    core.info("what is in this..")
    core.info(JSON.stringify(possiblePRsThatNeedAssignees));

    for (const pr of possiblePRsThatNeedAssignees) {
        core.info("checking pr...")
        // should i check if checks are still passing and add a precautionary message

        const diff = (Date.now() - Date.parse(pr.updated_at)) / (1000 * 60 * 60 * 24);
        
        // todo note that scope was to assign 24 hours after label..
        // https://octokit.github.io/rest.js/v18#issues-list-events
        if (diff < 1) {
            core.info("PR had activity in the last 24 hours, skipping as a precaution..."); // actually even commits count as activity so you need to check if it's contributor activity...
            continue;
        } 

        const events = await octokit.rest.issues.listEvents({
          owner,
          repo,
          issue_number,
        })
        .then(res => {core.info(JSON.stringify(res))}) 
        .catch(err => {throw err})

        const assignees = pickAssignees();

        // *NOTE: Only users with push access can add assignees to an issue. Assignees are silently ignored otherwise.
        await octokit.rest.issues.addAssignees({
            owner,
            repo,
            issue_number,
            assignees: assignees
        })
        .then(res => {core.info(`Assignee(s) ${assignees} have been assigned to PR ${issue_number} (if not already assigned).`); core.debug(JSON.stringify(res))}) // todo abstract away 
        .catch(err => {throw err})

    };
    
}

function pickAssignees() {
    return ["ppris"];
    // todo return possibleAssignees.any 
}

run();

/*
check what the issue update events is returning
-> get the label date 
random picker function
use alt and check whether all assignees being considered
*/