import core = require("@actions/core");
import github = require("@actions/github");
import { changeLabelsAfterReview } from "./changeToReviewToOngoing";
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);

const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
// const actor = github.context.actor;
// const issue_number = github.context.issue.number; // underscore to follow the api 
// const ref = github.context.ref;

//* to change in production
// todo rename this folder to periodic workflows, and most of the info here should be related to assign reviewer --> move it

// array of people who can be assigned 
const possibleAssignees = ["ppris", "pizapuzzle"];

const hoursBefAutoAssign = 6;

async function run() {
    try {
        await findPRsToAssignReviewers();
        await changeLabelsAfterReview();
    } catch (ex) {
        core.info(ex);
        core.setFailed(ex.message);
    }
}

async function findPRsToAssignReviewers() {
    const possiblePRsThatNeedAssignees = await octokit.rest.issues.listForRepo({
        owner,
        repo,
        state: "open",
        labels: "s.ToReview",
        assignee: "none",
        sort: "updated", // in case operation times out, focus on doing the latest PRs that may not have been seen first
        direction: "desc"
    })
    .then(res => {core.info("Note that these PRs may need reviewers\n" + JSON.stringify(res)); return res.data;}) // return the array of PRs
    .catch(err => { core.info(err); throw err })

    // assign PRs starting from a random person in the array, and for the next PR move on to the next index
    let indexForAssigning : number = getStartIndexForAssigning();
    core.info("index: " + indexForAssigning)

    for (const pr of possiblePRsThatNeedAssignees) {
        core.info("checking pr...");
        const issue_number = pr.number; // common property needed for rest api

        // todo should i check if checks are still passing and add a precautionary message

        // check if its time to auto assign 
        const tooSoon = await wasToReviewLabelAddedInTheLast(hoursBefAutoAssign, pr)
        if (tooSoon) {
            core.info(`PR #${issue_number} may have been assigned toReview label in the last ${hoursBefAutoAssign} hours, skipping...`); // actually even commits count as activity so you need to check if it's contributor activity...
            continue;
        } 

        // todo check if review comments have been given since last s.toReview so you don't need to assign? (though im guessing the label should have been changed to s.Ongoing --> unless you have to assign it)
        // https://octokit.github.io/rest.js/v18#pulls-list-review-comments

        const assignee : string = possibleAssignees[indexForAssigning];

        // *NOTE: Only users with push access can add assignees to an issue. Assignees are silently ignored otherwise.
        await octokit.rest.issues.addAssignees({
            owner,
            repo,
            issue_number,
            assignees: [assignee]
        })
        .then(res => {core.info(`Assignee ${assignee} have been assigned to PR ${issue_number}.`); core.info(JSON.stringify(res))}) // todo abstract away 
        .catch(err => {throw err}) // should i continue to next pr though?

        indexForAssigning = next(indexForAssigning);
        core.info("next index: " + indexForAssigning)

    };
    
}

run();

/**
 * Returns true if the to review label was added only in the last 24 hours. 
 * Assumes that the label is on this PR.
 * @param hours 
 */
async function wasToReviewLabelAddedInTheLast(hours : number, pr) : Promise<boolean> {
    core.info(`checking if label was added in the last ${hours} hours...`)
    const issue_number = pr.number;

    // sort by latest event first, so that we consider the last time that the toReview label was added
    // check if sort order correct
    const sortFn = (a, b) => {
        if (!a.created_at || !b.created_at) return 1; // move back
        return Date.parse(b.created_at) - Date.parse(a.created_at)
    }

    // get an array of events for the current issue (https://octokit.github.io/rest.js/v18#issues-list-events)
    const events = await octokit.rest.issues.listEvents({
        owner,
        repo,
        issue_number,
    })
    .then(res => res.data.sort(sortFn))
    .catch(err => {
        throw err;
    });
    
    const labelEvent = events.find(e => e.event === "labeled" && e.label?.name == "s.ToReview") ;

    if (!labelEvent) {
        core.warning("Some wrong assumption may have been made or the API used to fetch the PRs may have changed. This function should have been called only on PRs that are assigned the label.")
        return false;
    }

    const diffInHours = (Date.now() - Date.parse(labelEvent!.created_at)) / (1000 * 60 * 60);
    const res = diffInHours < hours;
    core.info(`difference is ${diffInHours} hours. is it less than ${hours}: ${res}`);
    return res;
}

/*
/ check what the issue update events is returning
/ -> get the label date 
/ random picker function
! use alt and check whether all assignees being considered

will there be any case where bot assigns someone but they unassign themself and don't assign anyone else? then the bot has to pick a new reviewer?
*/


////// ASSIGNEE HELPERS //////
// TODO assignee seems all over the place
/**
 * Generates integer from 0 to @param max 
 */
function random(maxInclusive : number) : number{
    return Math.round(Math.random() * maxInclusive);
}

function getStartIndexForAssigning() {
    return random(possibleAssignees.length - 1);
}

function next(idx : number) {
    idx++;
    if (idx >= possibleAssignees.length) {
        idx = 0;
    }
    return idx; 
}