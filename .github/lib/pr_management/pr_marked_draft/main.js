"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const common_1 = require("../common");
const token = core.getInput("repo-token");
const octokit = github.getOctokit(token);
// params to set for api requests
// check https://github.com/actions/toolkit/blob/main/packages/github/src/context.ts
const owner = github.context.repo.owner;
const repo = github.context.repo.repo;
const issue_number = github.context.issue.number;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const needsLabelling = yield isDraftAndNotLabelledOngoing();
            if (!needsLabelling) {
                core.info("needs no labelling, ending.");
                return;
            }
            yield common_1.addOngoingLabel();
        }
        catch (ex) {
            core.info(ex);
            core.setFailed(ex.message);
        }
    });
}
function isDraftAndNotLabelledOngoing() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: issue_number,
        })
            .then(res => {
            common_1.log.info(res.data.draft, `is pr ${issue_number} draft`);
            common_1.log.info(res.data.labels, "details of existing labels");
            return res.data.draft && res.data.labels.find(l => l.name === "s.Ongoing") === undefined;
        })
            .catch(err => { common_1.log.info(err, "error getting pr (issue) that triggered this workflow"); throw err; });
    });
}
run();
