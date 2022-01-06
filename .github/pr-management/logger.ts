/**
 * This module contains functions to that log using the core module with the format "label: itemToLog". 
 */

import * as core from '@actions/core'

////// functions to help with logging //////
function info(toPrint : any, label? : string) {
    if (label) {
        core.info(`${label}: ${toPrint}`);
    } else {
        core.info(toPrint);
    }
}

function warn(toPrint : any, label? : string) {
    core.warning(`${label}: ${toPrint}`);
}

export const log = { 
    info: info, 
    warn: warn, 
};

// TODO encapsulating core.logging functions with log 