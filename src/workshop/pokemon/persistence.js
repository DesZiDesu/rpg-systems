// Host saveChat/saveMetadata swallow HTTP failures in SillyTavern 1.19.
// Use the same public save endpoints, preserving the integrity guard and the
// whole chat, but require a server acknowledgement before confirming an action.
export async function savePokemonChat(context,{request=globalThis.fetch,current=()=>globalThis.SillyTavern?.getContext?.()||context}={}){
 const chatId=context.getCurrentChatId?.(),metadata=context.chatMetadata,live=current();
 if(!chatId||live.chatMetadata!==metadata||live.getCurrentChatId?.()!==chatId)throw Error('Chat changed before saving Pokémon progress');
 const header={chat_metadata:metadata,user_name:'unused',character_name:'unused'},chat=[header,...context.chat];
 let endpoint,body;
 if(context.groupId){if(!context.groups?.some(g=>g.id==context.groupId&&g.chat_id===chatId))throw Error('Group chat identity is unavailable');endpoint='/api/chats/group/save';body={id:chatId,chat,force:false};}
 else{const character=context.characters?.[context.characterId];if(!character?.avatar)throw Error('Character identity is unavailable');endpoint='/api/chats/save';body={ch_name:character.name,file_name:chatId,chat,avatar_url:character.avatar,force:false};}
 const response=await request(endpoint,{method:'POST',headers:context.getRequestHeaders(),cache:'no-cache',body:JSON.stringify(body)});
 if(!response.ok){const detail=await response.json().catch(()=>({}));throw Error(detail?.error==='integrity'?'Chat integrity check failed. Reload before retrying; no overwrite was requested.':'Pokémon progress could not be saved. Check the connection and retry.');}
 const after=current();if(after.chatMetadata!==metadata||after.getCurrentChatId?.()!==chatId)throw Error('Chat changed while saving Pokémon progress');
 return true;
}
