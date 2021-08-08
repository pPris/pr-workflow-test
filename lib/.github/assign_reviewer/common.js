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
exports.wereReviewCommentsAdded = void 0;
/**
 * Collection of common functions to use in this folder
 */
const core = require("@actions/core");
const github = require("@actions/github");
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);
const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
// todo move one level up
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
