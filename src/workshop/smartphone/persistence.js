// A single acknowledged save contains both phone state and the RPG wallet.
export async function savePhoneChat(context,{request=globalThis.fetch,current=()=>globalThis.SillyTavern?.getContext?.()||context}={}){
 const chatId=context.getCurrentChatId?.(),metadata=context.chatMetadata,live=current();
 if(!chatId||live.chatMetadata!==metadata||live.getCurrentChatId?.()!==chatId)throw Error('Chat changed before saving phone data');
 const chat=[{chat_metadata:metadata,user_name:'unused',character_name:'unused'},...context.chat];let endpoint,body;
 if(context.groupId){if(!context.groups?.some(g=>g.id===context.groupId&&g.chat_id===chatId))throw Error('Group chat identity is unavailable');endpoint='/api/chats/group/save';body={id:chatId,chat,force:false};}
 else{const character=context.characters?.[context.characterId];if(!character?.avatar)throw Error('Character identity is unavailable');endpoint='/api/chats/save';body={ch_name:character.name,file_name:chatId,chat,avatar_url:character.avatar,force:false};}
 const response=await request(endpoint,{method:'POST',headers:context.getRequestHeaders(),cache:'no-cache',body:JSON.stringify(body)});
 if(!response.ok)throw Error('Phone changes were not saved. Check the connection and retry; no success was confirmed.');
 const after=current();if(after.chatMetadata!==metadata||after.getCurrentChatId?.()!==chatId)throw Error('Chat changed while saving phone data');return true;
}
