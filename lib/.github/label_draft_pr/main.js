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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = __importDefault(require("@actions/core"));
const github_1 = __importDefault(require("@actions/github"));
const common_1 = require("../../lib/.github/common");
const token = core_1.default.getInput("repo-token");
const octokit = github_1.default.getOctokit(token);
// params to set
// check https://github.com/actions/toolkit/blob/main/packages/github/src/context.ts to figure out what's being responded
const owner = github_1.default.context.repo.owner;
const repo = github_1.default.context.repo.repo;
const issue_number = github_1.default.context.issue.number;
// todo old files needs to be standardized with new ones
// todo should core.getInput and getOctokit(token) be enclosed in try catch blocks
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            common_1.log.info(github_1.default.context.eventName);
            const isDraftPr = yield getPrDraftProperty();
            if (!isDraftPr) {
                common_1.log.info("not a draft pr, ending.");
                return;
            }
            // todo
            const label = yield octokit.rest.issues.addLabels({
                owner: owner,
                repo: repo,
                issue_number: issue_number,
                labels: ["s.Ongoing"]
            })
                .then(res => common_1.log.info(res, "adding label..."))
                .catch(err => common_1.log.info(err, "error adding label"));
        }
        catch (ex) {
            core_1.default.info(ex);
            core_1.default.setFailed(ex.message);
        }
    });
}
function getPrDraftProperty() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: issue_number,
        })
            .then(res => {
            common_1.log.info(res, "pr details...");
            common_1.log.warn(res.data.draft, "is draft");
            return res.data.draft;
        })
            .catch(err => common_1.log.info(err, "error getting pr (issue) that triggered this workflow"));
    });
}
run();
