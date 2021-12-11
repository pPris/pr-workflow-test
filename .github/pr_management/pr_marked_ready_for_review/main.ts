import * as core from '@actions/core'
import * as github from '@actions/github';
import { validateChecksOnPrHead } from '../common/checksValidation';
import { reviewKeywords, toReviewLabel, finalReviewLabel, toMergeLabel, ongoingLabel, errMessagePreamble } from '../common/const';
import { getCurrentPrLabels, removeLabel, addLabel, postComment, getSortedListOfEventsOnIssue, getSortedListOfComments } from '../common/githubManager/issues';
import { isPrDraft } from '../common/githubManager/pulls';
import { addAppropriateReviewLabel } from '../common/label';
// import { postComment, validateChecksOnPrHead, addLabel, removeLabel, ongoingLabel, toReviewLabel, finalReviewLabel, getSortedListOfEventsOnIssue, toMergeLabel, getSortedListOfComments, addAppropriateReviewLabel, errMessagePreamble, reviewKeywords } from "../common";
// import { getCurrentPRDetails, getCurrentPrLabels } from '../githubRequestsManager';
import { log } from '../logger';

const furtherInstructions = `Please comment \`${reviewKeywords}\` (case sensitive) when you've passed all checks, resolved merge conflicts and are ready to request a review.`

async function run() {
    if (await isPrDraft()) return; // needed because synchronise event triggers this workflow on even draft PRs

    const prLabels : string[] = await getCurrentPrLabels();

    const { didChecksPass: didChecksRunSuccessfully, errMessage } = await validateChecksOnPrHead();

    if (didChecksRunSuccessfully) {
        if (hasLabel(prLabels, toReviewLabel) || hasLabel(prLabels, finalReviewLabel) || hasLabel(prLabels, toMergeLabel)) {
            core.info("Already has a review label or toMerge label and checks are passing, nothing to be done here. exiting...")
            return;
        }

        // ongoing and ready-for-review prs mean that user was previously told to state when it's ready for review
        if (hasLabel(prLabels, ongoingLabel) && isOnSynchronise()) {
            core.info("Waiting for user to manually state ready to review. exiting...");
            return;
        }

        // if checks pass on 'pr open' event, or on 'convert to ready for review' event, 
        // then add review label (and drop ongoing if it exists)
        if (hasLabel(prLabels, ongoingLabel)) { 
            await removeLabel(ongoingLabel);
        }

        await addAppropriateReviewLabel();
        
    } else { 
        if (hasLabel(prLabels, ongoingLabel) && await wasAuthorLinkedToFailingChecks()) {
            core.info("PR has the ongoing label and author has previously been notified, exiting...")
            return;
        } 
        
        // remove the following labels if the pr currently has them
        await removeLabel(finalReviewLabel);
        await removeLabel(toReviewLabel);

        await addLabel(ongoingLabel);
        await postComment(errMessage + "\n" + furtherInstructions);
    }
}

run();

///// HELPER FUNCTIONS /////

// todo rename function to isCurrentRunTriggeredBySynchronise (?)
// todo also not very sure where to abstract away github.context.payload stuff since payload differs across every trigger
// checks if the currently running action get triggered by an on synchronise event
function isOnSynchronise() {
    log.info(github.context.payload.action, "what triggered this run");
    return github.context.payload.action === "synchronize";
}

/**
 * Finds a label from an array of labels.
 * @param arrayOfLabels 
 * @param label A string of the label to find in the array
 * @returns whether the label is found
 */
function hasLabel(arrayOfLabels : Array<string>,  label : string) : boolean{
    return arrayOfLabels.findIndex(l => l === label) !== -1;
}

/**
 * Checks if the bot did post a comment notifying the author of failing checks, from the last time the s.Ongoing label was applied.
 * This function is necessary for this case: 
 * A draft pr has an ongoing label -> author converts to ready for review but there's failing checks. The bot should comment once (i think).
 * 
 * There are two rest requests in this function itself, and this file is ran on every commit
 */
async function wasAuthorLinkedToFailingChecks() : Promise<boolean> {
    const events = await getSortedListOfEventsOnIssue();

    const labelEvent = events.find(e => e.event === "labeled" && e.label?.name == ongoingLabel);

    if (!labelEvent) {
        core.warning("Some wrong assumption may have been made or the API used to fetch the PRs may have changed. This function should have been called only on PRs that are assigned the label.")
        return true; // skip adding a comment 
    }

    const comments = await getSortedListOfComments(labelEvent.created_at);

    const checksFailedComment = comments.find(c => c.body.search(errMessagePreamble));

    log.info(checksFailedComment, "checksFailedComment");

    return !!checksFailedComment;
}