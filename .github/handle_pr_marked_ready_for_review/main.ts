// sketch

/*
so note that this action can be triggered for a few different events (but pr type is guaranteed not draft). 
purpose of this action: we just want to ensure that the pr is labelled s.Ongoing or s.ToReview accurately.

steps for this action
1. get pr in the context & its labels
2. get the conclusion of completed check suite (wait for completion if necessary)

3ai.  if checks are passing && not labelled s.ToReview nor s.Ongoing yet
      label s.ToReview

3aii. if checks are passing && has s.Ongoing label
      do nothing, wait for ready to review comment

3b. if checks are failing && pr has s.ToReview label
    i. label s.OnGoing
    ii. comment

3c. if checks are failing && pr has s.Ongoing label
    do nothing 
*/

import core = require("@actions/core");
import github = require("@actions/github");
import { log, dropToReviewLabelAndAddOngoing, addToReviewLabel, 
    postComment, validateChecksOnPrHead } from "../common";

const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);

// params to set
const owner = github.context.repo.owner; 
const repo = github.context.repo.repo;
const issue_number = github.context.issue.number;


async function run() {
    const prLabels : string[] = await octokit.rest.issues.get({
        owner,
        repo, 
        issue_number
    })
    .then(res => res.data.labels.map(label => label.name || label)) // label may be of type string instead of an object so need this ||
    .then(l => log.info(l, `labels returned for pr ${issue_number}`))
    .catch(err => {core.info(err); throw err});

    const { didChecksRunSuccessfully, errMessage } = await validateChecksOnPrHead();

    if (didChecksRunSuccessfully) {
        if (!hasLabel(prLabels, "s.Ongoing") && !hasLabel(prLabels, "s.ToReview")) {
            await addToReviewLabel(); // todo check correct pr
        } else if (hasLabel(prLabels, "s.Ongoing")) {
            core.info("wait for user to manually state ready to review. exiting...");
            return; 
        }
    } else { 
        if (hasLabel(prLabels, "s.Ongoing")) {
            // shouldn't exit if the author hasn't been warned to clear checks 
                // i.e. they just converted PR to rfr, or
                // they just converted PR to rfr and just pushed a merge resolve, in which case how are you going to find this event
            core.info(github.context.eventName);
            core.info("PR has the ongoing label, exiting...")
            return;
        } else if (hasLabel(prLabels, "s.ToReview")) {
            await dropToReviewLabelAndAddOngoing();
            await postComment(errMessage);
        }
    }
}

function hasLabel(arrayOfLabels : Array<string>,  label) : boolean{
    return arrayOfLabels.findIndex(l => l ===label) !== -1;
}

/**
 * Checks if the bot did post a comment notifying the author of failing checks, from the last time the s.Ongoing label was applied.
 * This function is necessary for this case: 
 * A draft pr has an ongoing label -> author converts to ready for review but there's failing checks. The bot should comment once (i think).
 * 
 * There are two rest requests in this function itself, and this file is ran at every commit
 * todo improvement: run this check only once in a while on PRs marked ongoing
 */
async function wasAuthorLinkedToFailingChecks() : Promise<boolean> {
    // sort by latest event first, so that we consider the last time that the toReview label was added
    // todo check if sort order correct
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
    
    const labelEvent = events.find(e => e.event === "labeled" && e.label?.name == "s.Ongoing");

    if (!labelEvent) {
        core.warning("Some wrong assumption may have been made or the API used to fetch the PRs may have changed. This function should have been called only on PRs that are assigned the label.")
        return true; // skip adding a comment 
    }

    // // get an array of events for the current issue (https://octokit.github.io/rest.js/v18#issues-list-events)
    const comments = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number,
        since: labelEvent.created_at
    })
    .then(res => res.data.sort(sortFn))
    .catch(err => {
        throw err;
    });

    const checksFailedComment = comments.find(c => c.body.search("There were unsuccessful conclusions found"));

    log.info(checksFailedComment, "checksFailedComment");

    return !!checksFailedComment;
}

run();