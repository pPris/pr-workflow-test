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
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        // get pr
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
                core.info("PR has the ongoing label, exiting...");
                return;
            }
            else if (hasLabel(prLabels, "s.ToReview")) {
                yield common_1.dropToReviewLabelAndAddOngoing();
                yield common_1.postComment(errMessage);
            }
        }
    });
}
function hasLabel(arrayOfLabels, label) {
    return arrayOfLabels.findIndex(l => l === label) !== -1;
}
run();
