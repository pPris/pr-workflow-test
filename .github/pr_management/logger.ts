import * as core from '@actions/core'

////// functions to help with logging //////
/* these functions log using the core module but with the format "label: itemToLog". 
They also return the variable being logged for convenience */
export const log = { 
    info: info, 
    warn: warn, 
    jsonInfo: jsonInfo 
};

function info(toPrint : any, label? : string) {
    core.info(`${label}: ${toPrint}`);
    return toPrint; // todo, this is unstandardized, remove after testing the rest?
}

function jsonInfo(jsonToPrint: JSON, label? : string) {
    core.info(`${label}: ${JSON.stringify(jsonToPrint)}`);
}

function warn(toPrint : any, label? : string) {
    core.warning(`${label}: ${toPrint}`);
}

// TODO
// current issue is not standardizing functions that print messages with labels (now in logger)
// and messages without labels (using core)
// either we just stick to using the core functionality (wrapped in logger)
// or find a better way to do this (ugly way like checking for multiple arguments)
// or maybe just (for each str passed in as argument, concatenate) and send it to core.info

//* this is a low priority issue. do this last 