import {requestDataTask} from './task-generation.js?v=0.90.18';
export {taskGenerationMode as commerceGenerationMode,taskErrorMessage as commerceErrorMessage} from './task-generation.js?v=0.90.18';
export const requestCommerceTask=(context,args,legacy)=>requestDataTask(context,args,legacy,{task:'commerce',apiErrorCode:'opening-api'});
