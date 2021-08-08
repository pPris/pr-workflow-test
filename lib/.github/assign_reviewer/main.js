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
const changeToReviewToOngoing_1 = require("./changeToReviewToOngoing");
const assignReviewersToPRs_1 = require("./assignReviewersToPRs");
// todo rename this folder to periodic workflows, and most of the info here should be related to assign reviewer --> move it
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield assignReviewersToPRs_1.findPRsAndAssignReviewers();
            yield changeToReviewToOngoing_1.changeLabelsAfterReview();
        }
        catch (ex) {
            core.info(ex);
            core.setFailed(ex.message);
        }
    });
}
run();
