"use strict";
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
exports.log = exports.dropToReviewLabelAndAddOngoing = exports.dropOngoingLabelAndAddToReview = exports.addToReviewLabel = exports.addOngoingLabel = exports.wereReviewCommentsAdded = void 0;
/**
 * Collection of common functions to use in this folder
 */
const core = require("@actions/core");
const github = require("@actions/github");
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);
const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
const issue_number = github.context.issue.number;
function wereReviewCommentsAdded(pr, sinceTimeStamp) {
    return __awaiter(this, void 0, void 0, function* () {
        isValidTimestamp(sinceTimeStamp);
        const comments = yield octokit.rest.pulls.listReviewComments({
            owner,
            repo,
            pull_number: pr.number,
            since: sinceTimeStamp // todo unsure if this works as expected --> test
        })
            .then(res => { core.info("these comments were retrieved\n" + res); return res; }) // todo log properly w pr number
            .catch(err => { throw err; });
        return comments.data.length > 0;
    });
}
exports.wereReviewCommentsAdded = wereReviewCommentsAdded;
function isValidTimestamp(sinceTimeStamp) {
    try {
        Date.parse(sinceTimeStamp);
    }
    catch (err) {
        throw new Error(`the sinceTimeStamp argument passed is an invalid timestamp`);
    }
}
// todo delete if unused
function addOngoingLabel() {
    return __awaiter(this, void 0, void 0, function* () {
        yield addLabel("s.Ongoing");
    });
}
exports.addOngoingLabel = addOngoingLabel;
function addToReviewLabel() {
    return __awaiter(this, void 0, void 0, function* () {
        yield addLabel("s.ToReview");
    });
}
exports.addToReviewLabel = addToReviewLabel;
function dropOngoingLabelAndAddToReview() {
    return __awaiter(this, void 0, void 0, function* () {
        yield removeLabel("s.Ongoing");
        yield addLabel("s.ToReview");
    });
}
exports.dropOngoingLabelAndAddToReview = dropOngoingLabelAndAddToReview;
function dropToReviewLabelAndAddOngoing() {
    return __awaiter(this, void 0, void 0, function* () {
        yield removeLabel("s.ToReview");
        yield addLabel("s.Ongoing");
    });
}
exports.dropToReviewLabelAndAddOngoing = dropToReviewLabelAndAddOngoing;
function addLabel(labelName) {
    return __awaiter(this, void 0, void 0, function* () {
        yield octokit.rest.issues.addLabels({
            owner,
            repo,
            issue_number,
            labels: [labelName]
        })
            .then(res => exports.log.info(res.status, "added label with status"))
            .catch(err => exports.log.info(err, "error adding label"));
    });
}
function removeLabel(labelName) {
    return __awaiter(this, void 0, void 0, function* () {
        yield octokit.rest.issues.removeLabel({
            owner,
            repo,
            issue_number,
            name: [labelName], // todo check if this works
        })
            .then(res => logInfo(res.status, "removing label with status"))
            .catch(err => logInfo(err, "error removing label (label may not have been applied)"));
    });
}
////// things to help with logging
exports.log = { info: logInfo, warn: logWarn, jsonInfo: jsonInfo };
function logInfo(toPrint, label) {
    core.info(`${label}: ${toPrint}`);
}
function jsonInfo(jsonToPrint, label) {
    core.info(`${label}: ${JSON.stringify(jsonToPrint)}`);
}
function logWarn(toPrint, label) {
    core.warning(`${label}: ${toPrint}`);
}
