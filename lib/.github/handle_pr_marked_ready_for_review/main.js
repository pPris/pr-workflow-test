"use strict";
// sketch
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const core = require("@actions/core");
const github = require("@actions/github");
const common_1 = require("../common");
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);
// params to set
const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
const issue_number = github.context.issue.number;
common_1.log.info(github.context.payload.action, "payload action");
const furtherInstructions = "Please comment `@bot ready for review` when you've passed all checks, resolved merge conflicts and are ready to request a review.";
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(yield isPRMarkedReadyForReview()))
            return; // needed because synchronise event triggers this workflow 
        const prLabels = yield octokit.rest.issues.get({
            owner,
            repo,
            issue_number
        })
            .then(res => res.data.labels.map(label => label.name || label)) // label may be of type string instead of an object so need this ||
            .then(l => common_1.log.info(l, `labels returned for pr ${issue_number}`))
            .catch(err => { core.info(err); throw err; });
        const { didChecksRunSuccessfully, errMessage } = yield common_1.validateChecksOnPrHead();
        if (didChecksRunSuccessfully) {
            if (!hasLabel(prLabels, "s.Ongoing") && !hasLabel(prLabels, "s.ToReview")) {
                yield common_1.addToReviewLabel(); // todo check correct pr
            }
            else if (hasLabel(prLabels, "s.Ongoing")) {
                core.info("wait for user to manually state ready to review. exiting...");
                return;
            }
        }
        else {
            if (hasLabel(prLabels, "s.Ongoing")) {
                if (yield wasAuthorLinkedToFailingChecks()) {
                    core.info("PR has the ongoing label and author has been warned, exiting...");
                    return;
                }
                else {
                    yield common_1.postComment(errMessage + "\n" + furtherInstructions);
                }
            }
            else if (hasLabel(prLabels, "s.ToReview")) {
                yield common_1.dropToReviewLabelAndAddOngoing();
                yield common_1.postComment(errMessage + "\n" + furtherInstructions);
            }
        }
    });
}
run();
///// HELPER FUNCTIONS /////
function hasLabel(arrayOfLabels, label) {
    return arrayOfLabels.findIndex(l => l === label) !== -1;
}
/**
 * Checks if the bot did post a comment notifying the author of failing checks, from the last time the s.Ongoing label was applied.
 * This function is necessary for this case:
 * A draft pr has an ongoing label -> author converts to ready for review but there's failing checks. The bot should comment once (i think).
 *
 * There are two rest requests in this function itself, and this file is ran at every commit
 * todo improvement: run this check only once in a while on PRs marked ongoing
 */
function wasAuthorLinkedToFailingChecks() {
    return __awaiter(this, void 0, void 0, function* () {
        // sort by latest event first, so that we consider the last time that the toReview label was added
        // todo check if sort order correct
        const sortFn = (a, b) => {
            if (!a.created_at || !b.created_at)
                return 1; // move back
            return Date.parse(b.created_at) - Date.parse(a.created_at);
        };
        // get an array of events for the current issue (https://octokit.github.io/rest.js/v18#issues-list-events)
        const events = yield octokit.rest.issues.listEvents({
            owner,
            repo,
            issue_number,
        })
            .then(res => res.data.sort(sortFn))
            .catch(err => {
            throw err;
        });
        const labelEvent = events.find(e => { var _a; return e.event === "labeled" && ((_a = e.label) === null || _a === void 0 ? void 0 : _a.name) == "s.Ongoing"; });
        if (!labelEvent) {
            core.warning("Some wrong assumption may have been made or the API used to fetch the PRs may have changed. This function should have been called only on PRs that are assigned the label.");
            return true; // skip adding a comment 
        }
        // // get an array of events for the current issue (https://octokit.github.io/rest.js/v18#issues-list-events)
        const comments = yield octokit.rest.issues.listComments({
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
        common_1.log.info(checksFailedComment, "checksFailedComment");
        return !!checksFailedComment;
    });
}
function isPRMarkedReadyForReview() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: issue_number,
        })
            .then(res => {
            common_1.log.info(res.data.draft, `is pr ${issue_number} draft`);
            return !res.data.draft;
        })
            .catch(err => { common_1.log.info(err, "error getting pr that triggered this workflow"); throw err; });
    });
}
