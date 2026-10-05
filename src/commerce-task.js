// SillyTavern generateRaw runs AI-output regexes and story cleanup even when
// trimNames:false. Machine JSON must be read before that presentation pipeline.
export const commerceGenerationMode=context=>typeof context.generateRawData==='function'&&typeof context.extractMessageFromData==='function'?'native-data':typeof context.generateRaw==='function'?'native-task':'legacy-quiet';

export function commerceErrorMessage(failure){
 const value=failure?.message??failure?.error?.message??failure?.error??failure?.response??(typeof failure==='string'?failure:'');
 return String(typeof value==='object'?'API request failed':value||'API request failed')
  .replace(/Bearer\s+\S+/giu,'Bearer [redacted]')
  .replace(/\bsk-[\w-]+/gu,'[redacted]')
  .replace(/((?:api[_-]?key|access[_-]?token|authorization)\s*[=:]\s*)[^\s&,;]+/giu,'$1[redacted]').slice(0,1200);
}

export async function requestCommerceTask(context,args,legacy){
 const mode=commerceGenerationMode(context);
 const configured=context.mainApi==='openai'?context.chatCompletionSettings?.openai_max_tokens:context.mainApi==='textgenerationwebui'?context.textCompletionSettings?.max_tokens:null;
 const responseLength=Number.isSafeInteger(configured)&&configured>0?Math.min(args.responseLength,configured):args.responseLength;
 let data,text;
 try{
  if(mode==='native-data'){
   data=await context.generateRawData({...args,responseLength});
   text=context.extractMessageFromData(data,context.mainApi);
  }else if(mode==='native-task')text=await context.generateRaw({...args,responseLength});
  else{
   if(typeof context.generateQuietPrompt!=='function')throw Error('unavailable');
   text=await context.generateQuietPrompt({...legacy,responseLength});
  }
  const finishReason=data?.choices?.[0]?.finish_reason??data?.stop_reason??data?.finishReason??data?.candidates?.[0]?.finishReason;
  if(['length','max_tokens','MAX_TOKENS'].includes(finishReason))throw Object.assign(Error('The API reached its output token limit before completing the commerce response'),{code:'response-truncated',finishReason});
  if(typeof text!=='string'||!text.trim())throw Object.assign(Error('No message generated'),{code:'response-empty'});
  return text;
 }catch(failure){
  const message=commerceErrorMessage(failure);
  const error=Object.assign(Error(message),{code:failure?.code||(message==='No message generated'?'response-empty':message==='unavailable'?'unavailable':'opening-api'),responseText:typeof text==='string'?text:undefined,details:{generation:mode,api:context.mainApi||null,responseLength,providerError:message,...(failure?.finishReason?{finishReason:failure.finishReason}:{})}});
  throw error;
 }
}
