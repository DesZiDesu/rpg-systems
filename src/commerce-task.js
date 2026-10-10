import {requestDataTask} from './task-generation.js?v=0.64.0';
export {taskGenerationMode as commerceGenerationMode,taskErrorMessage as commerceErrorMessage} from './task-generation.js?v=0.64.0';
export const requestCommerceTask=(context,args,legacy)=>requestDataTask(context,args,legacy,{task:'commerce',apiErrorCode:'opening-api'});
