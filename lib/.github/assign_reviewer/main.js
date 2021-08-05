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
const core = require("@actions/core");
const github = require("@actions/github");
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);
const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
const actor = github.context.actor;
const issueNum = github.context.issue.number;
const ref = github.context.ref;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield getOpenPRs();
        }
        catch (ex) {
            core.info(ex);
            core.setFailed(ex.message);
        }
    });
}
function getOpenPRs() {
    return __awaiter(this, void 0, void 0, function* () {
        yield octokit.rest.issues.listForRepo({
            owner,
            repo,
            state: "open",
            labels: "s.ToReview",
            assignee: "none"
        })
            .then(res => core.info(JSON.stringify(res)))
            .catch(err => { core.info(err); throw err; });
    });
}
run();
