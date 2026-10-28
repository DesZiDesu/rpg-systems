// Queued gestures retain their original character/chat authority.
export function createPhoneQueue({capture,valid,before=()=>{},onError=()=>{}}){
 let tail=Promise.resolve();
 return {
  run(operation){
   const ticket=capture();
   const run=tail.catch(()=>{}).then(async()=>{
    before();if(!valid(ticket))throw Object.assign(Error('The chat changed before this phone action.'),{name:'AbortError',code:'stale-scope'});
    return operation();
   });
   tail=run;run.catch(error=>{if(valid(ticket))onError(error);});return run;
  },
  reset(){tail=Promise.resolve();},
 };
}
